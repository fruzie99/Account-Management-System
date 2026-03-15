const { createAuthedSupabaseClient } = require("../config/supabaseClient");

const PROFILE_TABLES = ["profiles", "users"];

const isMissingRelationError = (error) => {
  const message = (error?.message || "").toLowerCase();
  return (
    message.includes("relation") ||
    message.includes("does not exist") ||
    message.includes("schema cache")
  );
};

const isMissingColumnError = (error) => {
  const message = (error?.message || "").toLowerCase();
  return message.includes("column") && message.includes("does not exist");
};

const isSkippableTableError = (error) =>
  isMissingRelationError(error) || isMissingColumnError(error);

const toNumber = (value) => {
  if (value === null || value === undefined) {
    return 0;
  }

  const parsed = Number(value);
  return Number.isNaN(parsed) ? 0 : parsed;
};

const pickProfileName = (profile, fallbackName = null) => {
  return profile?.full_name || profile?.name || profile?.fullName || fallbackName;
};

const normalizeProfile = (profile, authUser) => {
  return {
    id: profile?.id || authUser.id,
    email: profile?.email || authUser.email || null,
    fullName: pickProfileName(profile, authUser.user_metadata?.name || null),
    balance: toNumber(profile?.balance),
  };
};

const getProfileById = async (supabase, tableName, userId) => {
  const { data, error } = await supabase
    .from(tableName)
    .select("*")
    .eq("id", userId)
    .maybeSingle();

  return { data, error };
};

const getProfileByEmail = async (supabase, tableName, email) => {
  const { data, error } = await supabase
    .from(tableName)
    .select("*")
    .eq("email", email)
    .maybeSingle();

  return { data, error };
};

const getProfileWithFallback = async (supabase, authUser) => {
  for (const tableName of PROFILE_TABLES) {
    const byIdResult = await getProfileById(supabase, tableName, authUser.id);

    if (byIdResult.error) {
      if (isSkippableTableError(byIdResult.error)) {
        continue;
      }

      return { data: null, tableName: null, error: byIdResult.error };
    }

    if (byIdResult.data) {
      return {
        data: normalizeProfile(byIdResult.data, authUser),
        tableName,
        error: null,
      };
    }

    const byEmailResult = await getProfileByEmail(
      supabase,
      tableName,
      authUser.email
    );

    if (byEmailResult.error) {
      if (isSkippableTableError(byEmailResult.error)) {
        continue;
      }

      return { data: null, tableName: null, error: byEmailResult.error };
    }

    if (byEmailResult.data) {
      return {
        data: normalizeProfile(byEmailResult.data, authUser),
        tableName,
        error: null,
      };
    }
  }

  return {
    data: normalizeProfile(null, authUser),
    tableName: null,
    error: null,
  };
};

const getRawTransactions = async (supabase, userId, limit = 10) => {
  const runQuery = async (orderByCreatedAt) => {
    let query = supabase
      .from("transactions")
      .select("*")
      .or(`sender_id.eq.${userId},receiver_id.eq.${userId}`)
      .limit(limit);

    if (orderByCreatedAt) {
      query = query.order("created_at", { ascending: false });
    }

    return query;
  };

  let { data, error } = await runQuery(true);

  if (error && isMissingColumnError(error)) {
    ({ data, error } = await runQuery(false));
  }

  if (error && isMissingRelationError(error)) {
    return { data: [], error: null };
  }

  if (error) {
    return { data: [], error };
  }

  return { data: data || [], error };
};

const getParticipantMapFromTable = async (
  supabase,
  participantIds,
  tableName
) => {
  if (participantIds.length === 0) {
    return { data: new Map(), error: null };
  }

  const { data, error } = await supabase
    .from(tableName)
    .select("*")
    .in("id", participantIds);

  if (error) {
    if (isSkippableTableError(error)) {
      return { data: new Map(), error: null };
    }

    return { data: new Map(), error };
  }

  return {
    data: new Map((data || []).map((profile) => [profile.id, profile])),
    error: null,
  };
};

const getParticipantMap = async (supabase, transactions, preferredTableName) => {
  const participantIds = Array.from(
    new Set(
      transactions
        .flatMap((item) => [item.sender_id, item.receiver_id])
        .filter(Boolean)
    )
  );

  if (participantIds.length === 0) {
    return { data: new Map(), error: null };
  }

  const tablesToCheck = preferredTableName
    ? [
        preferredTableName,
        ...PROFILE_TABLES.filter((table) => table !== preferredTableName),
      ]
    : PROFILE_TABLES;

  for (const tableName of tablesToCheck) {
    const result = await getParticipantMapFromTable(
      supabase,
      participantIds,
      tableName
    );

    if (result.error) {
      return result;
    }

    if (result.data.size > 0) {
      return result;
    }
  }

  return { data: new Map(), error: null };
};

const mapTransaction = (item, currentUserId, profileMap) => {
  const sender = profileMap.get(item.sender_id);
  const receiver = profileMap.get(item.receiver_id);

  const normalizedType =
    item.transaction_type === "credit" || item.transaction_type === "debit"
      ? item.transaction_type
      : item.sender_id === currentUserId
      ? "debit"
      : "credit";

  return {
    id: item.id,
    transactionType: normalizedType,
    amount: toNumber(item.amount),
    sender:
      pickProfileName(sender, sender?.email) ||
      (item.sender_id === currentUserId ? "You" : "Unknown"),
    receiver:
      pickProfileName(receiver, receiver?.email) ||
      (item.receiver_id === currentUserId ? "You" : "Unknown"),
    balanceAfterTransaction:
      item.balance_after_transaction === null ||
      item.balance_after_transaction === undefined
        ? null
        : toNumber(item.balance_after_transaction),
    createdAt: item.created_at || null,
  };
};

const getDashboard = async (req, res) => {
  const supabase = createAuthedSupabaseClient(req.accessToken);
  const userId = req.user.id;

  const profileResult = await getProfileWithFallback(supabase, req.user);

  if (profileResult.error) {
    return res.status(500).json({ message: profileResult.error.message });
  }

  const transactionResult = await getRawTransactions(supabase, userId, 8);

  if (transactionResult.error) {
    return res.status(500).json({ message: transactionResult.error.message });
  }

  const participantResult = await getParticipantMap(
    supabase,
    transactionResult.data,
    profileResult.tableName
  );

  if (participantResult.error) {
    return res.status(500).json({ message: participantResult.error.message });
  }

  const recentActivity = transactionResult.data.map((item) =>
    mapTransaction(item, userId, participantResult.data)
  );

  return res.status(200).json({
    account: {
      id: profileResult.data.id,
      email: profileResult.data.email,
      fullName: profileResult.data.fullName,
    },
    balance: toNumber(profileResult.data.balance),
    recentActivity,
    refreshedAt: new Date().toISOString(),
  });
};

const getBalance = async (req, res) => {
  const supabase = createAuthedSupabaseClient(req.accessToken);
  const profileResult = await getProfileWithFallback(supabase, req.user);

  if (profileResult.error) {
    return res.status(500).json({ message: profileResult.error.message });
  }

  return res.status(200).json({
    balance: toNumber(profileResult.data.balance),
    refreshedAt: new Date().toISOString(),
  });
};

const getStatement = async (req, res) => {
  const supabase = createAuthedSupabaseClient(req.accessToken);
  const userId = req.user.id;

  const transactionResult = await getRawTransactions(supabase, userId, 100);

  if (transactionResult.error) {
    return res.status(500).json({ message: transactionResult.error.message });
  }

  const profileResult = await getProfileWithFallback(supabase, req.user);

  if (profileResult.error) {
    return res.status(500).json({ message: profileResult.error.message });
  }

  const participantResult = await getParticipantMap(
    supabase,
    transactionResult.data,
    profileResult.tableName
  );

  if (participantResult.error) {
    return res.status(500).json({ message: participantResult.error.message });
  }

  const statement = transactionResult.data.map((item) =>
    mapTransaction(item, userId, participantResult.data)
  );

  return res.status(200).json({
    statement,
    refreshedAt: new Date().toISOString(),
  });
};

module.exports = {
  getDashboard,
  getBalance,
  getStatement,
};