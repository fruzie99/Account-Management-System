const { supabase } = require("../config/supabaseClient");

const isValidEmail = (email) => typeof email === "string" && email.includes("@");

const isValidPassword = (password) =>
  typeof password === "string" && password.length >= 6;

const signup = async (req, res) => {
  const { email, password } = req.body;

  if (!isValidEmail(email) || !isValidPassword(password)) {
    return res.status(400).json({
      message: "Provide a valid email and a password with at least 6 characters.",
    });
  }

  const { data, error } = await supabase.auth.signUp({ email, password });

  if (error) {
    return res.status(400).json({ message: error.message });
  }

  // With Confirm email OFF, signUp usually returns a session directly.
  if (data?.session && data?.user) {
    return res.status(201).json({
      message: "Signup successful.",
      user: data.user,
      session: data.session,
    });
  }

  // If no session comes back, attempt sign-in so registration can still
  // behave like immediate login when project settings allow it.
  const { data: signInData, error: signInError } =
    await supabase.auth.signInWithPassword({
      email,
      password,
    });

  if (signInError) {
    const errorMessage =
      signInError.message || "Unable to sign in after signup.";

    if (errorMessage.toLowerCase().includes("email not confirmed")) {
      return res.status(403).json({
        message:
          "Email confirmation is still enabled in Supabase. Turn off Confirm email and save changes.",
      });
    }

    return res.status(400).json({ message: errorMessage });
  }

  return res.status(201).json({
    message: "Signup successful.",
    user: signInData.user,
    session: signInData.session,
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

    if (errorMessage.toLowerCase().includes("email not confirmed")) {
      return res.status(401).json({
        message:
          "Email not confirmed. Turn off Confirm email in Supabase, then create a fresh account.",
      });
    }

    return res.status(401).json({ message: error.message });
  }

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