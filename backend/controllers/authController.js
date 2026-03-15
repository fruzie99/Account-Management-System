const { supabase, createAuthedSupabaseClient } = require("../config/supabaseClient");

const isValidEmail = (email) => typeof email === "string" && email.includes("@");

const isValidPassword = (password) =>
  typeof password === "string" && password.length >= 6;

const isEmailConfirmationError = (message) =>
  String(message || "").toLowerCase().includes("email not confirmed");

const getUserName = (user) => {
  const emailPrefix = String(user?.email || "").split("@")[0];
  return user?.user_metadata?.name || emailPrefix || "User";
};

const ensureUserRecord = async (accessToken, user) => {
  if (!accessToken || !user?.id || !user?.email) {
    return;
  }

  try {
    const authedClient = createAuthedSupabaseClient(accessToken);
    const { error } = await authedClient.from("users").upsert(
      [{
        id: user.id,
        email: user.email,
        balance: 0,
        name: getUserName(user),
        password: null,
      }],
      { onConflict: "id", ignoreDuplicates: true }
    );

    if (error) {
      console.error("[ensureUserRecord] Failed to upsert user row:", error.message);
    }
  } catch (error) {
    console.error("[ensureUserRecord] Exception:", error.message);
  }
};

const signup = async (req, res) => {
  const { email, password } = req.body;

  if (!isValidEmail(email) || !isValidPassword(password)) {
    return res.status(400).json({
      message: "Provide a valid email and a password with at least 6 characters.",
    });
  }

  const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
    email,
    password,
  });

  if (signUpError) {
    return res.status(400).json({ message: signUpError.message });
  }

  let authData = signUpData;

  if (!authData?.session || !authData?.user) {
    const { data: signInData, error: signInError } =
      await supabase.auth.signInWithPassword({
        email,
        password,
      });

    if (signInError) {
      const errorMessage =
        signInError.message || "Unable to sign in after signup.";

      if (isEmailConfirmationError(errorMessage)) {
        return res.status(403).json({
          message:
            "Email confirmation is still enabled in Supabase. Turn off Confirm email and save changes.",
        });
      }

      return res.status(400).json({ message: errorMessage });
    }

    authData = signInData;
  }

  await ensureUserRecord(authData.session?.access_token, authData.user);
  return res.status(201).json({
    message: "Signup successful.",
    user: authData.user,
    session: authData.session,
  });
};

const login = async (req, res) => {
  const { email, password } = req.body;

  if (!isValidEmail(email) || !isValidPassword(password)) {
    return res.status(400).json({
      message: "Provide a valid email and password.",
    });
  }

  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    const errorMessage = error.message || "Unable to login.";

    if (isEmailConfirmationError(errorMessage)) {
      return res.status(401).json({
        message:
          "Email not confirmed. Turn off Confirm email in Supabase, then create a fresh account.",
      });
    }

    return res.status(401).json({ message: error.message });
  }

  await ensureUserRecord(data.session?.access_token, data.user);
  return res.status(200).json({
    message: "Login successful.",
    user: data.user,
    session: data.session,
  });
};

module.exports = {
  signup,
  login,
};