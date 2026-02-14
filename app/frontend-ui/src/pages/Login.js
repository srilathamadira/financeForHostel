import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Eye, EyeOff } from "lucide-react";

export default function Login() {
  const navigate = useNavigate();
  const { login } = useAuth();

  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const [formData, setFormData] = useState({
    username: "",
    password: "",
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      await login(formData.username, formData.password);
      toast.success("Login successful!");
      navigate("/");
    } catch (error) {
      toast.error(
        error.response?.data?.detail || "Invalid username or password"
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-100 via-white to-slate-200 p-6">

      {/* LOGIN CARD */}
      <div className="w-full max-w-md">

        <div className="bg-white/90 backdrop-blur rounded-2xl border border-slate-200 shadow-xl p-10">

          {/* HEADER */}
          <div className="text-center mb-8">
            <h2 className="text-3xl font-bold text-slate-900 mb-2">
              Khan's Hostel
            </h2>
            <p className="text-sm text-slate-500">
              Sign in to continue
            </p>
          </div>

          {/* FORM */}
          <form onSubmit={handleSubmit} className="space-y-6">

            {/* USERNAME */}
            <div className="space-y-2">
              <Label className="text-sm font-medium text-slate-700">
                Username
              </Label>
              <Input
                type="text"
                placeholder="Enter username"
                value={formData.username}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    username: e.target.value,
                  })
                }
                required
                className="h-11 rounded-xl focus-visible:ring-2 focus-visible:ring-slate-900"
              />
            </div>

            {/* PASSWORD */}
            <div className="space-y-2">
              <Label className="text-sm font-medium text-slate-700">
                Password
              </Label>

              <div className="relative">
                <Input
                  type={showPassword ? "text" : "password"}
                  placeholder="Enter password"
                  value={formData.password}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      password: e.target.value,
                    })
                  }
                  required
                  className="h-11 rounded-xl pr-10 focus-visible:ring-2 focus-visible:ring-slate-900"
                />

                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-800 transition"
                >
                  {showPassword ? (
                    <EyeOff className="w-4 h-4" />
                  ) : (
                    <Eye className="w-4 h-4" />
                  )}
                </button>
              </div>
            </div>

            {/* BUTTON */}
            <Button
              type="submit"
              disabled={loading}
              className="w-full h-11 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-medium shadow-md transition"
            >
              {loading ? "Signing in..." : "Login"}
            </Button>

          </form>

        </div>

        {/* FOOTER */}
        <p className="text-center text-xs text-slate-500 mt-6">
          
        </p>

      </div>
    </div>
  );
}
