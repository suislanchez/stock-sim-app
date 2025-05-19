"use client";
import React, { useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSignUp, setIsSignUp] = useState(false);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const { data, error } = isSignUp
        ? await supabase.auth.signUp({ email, password })
        : await supabase.auth.signInWithPassword({ email, password });

      if (error) throw error;

      if (isSignUp && data.user) {
        // Create a profile for new users
        const { error: profileError } = await supabase
          .from('profiles')
          .insert([
            {
              id: data.user.id,
              email: data.user.email,
              balance: 10000.00 // Starting balance
            }
          ]);

        if (profileError) throw profileError;
      }

      router.push("/dashboard");
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-50">
      <form
        onSubmit={handleAuth}
        className="flex flex-col p-8 bg-white rounded shadow-md w-full max-w-sm"
      >
        <h1 className="text-3xl font-bold mb-6 text-center text-black">Stock-Sim-Social</h1>
        <h2 className="text-2xl font-bold mb-4 text-black">
          {isSignUp ? "Sign Up" : "Log In"}
        </h2>
        {error && <p className="text-red-500 mb-4">{error}</p>}

        <div className="mb-4">
          <label className="block text-black font-medium mb-2">Email</label>
          <input
            type="email"
            className="border p-2 w-full rounded text-black"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>

        <div className="mb-6">
          <label className="block text-black font-medium mb-2">Password</label>
          <input
            type="password"
            className="border p-2 w-full rounded text-black"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </div>

        <button
          type="submit"
          className="bg-blue-500 text-white py-2 rounded mb-4 hover:bg-blue-600 transition-colors"
          disabled={loading}
        >
          {loading
            ? "Loading..."
            : isSignUp
            ? "Sign Up"
            : "Log In"}
        </button>

        <button
          type="button"
          className="text-sm text-black hover:text-gray-600 transition-colors"
          onClick={() => setIsSignUp(!isSignUp)}
        >
          {isSignUp
            ? "Already have an account? Log In"
            : "Don't have an account? Sign Up"}
        </button>
      </form>
    </div>
  );
}