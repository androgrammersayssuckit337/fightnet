import { useState } from "react";
import { useAuth, API } from "@/App";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import axios from "axios";

export default function AuthPage() {
  const { login } = useAuth();
  const [isLogin, setIsLogin] = useState(true);
  const [loading, setLoading] = useState(false);
  
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    username: "",
    first_name: "",
    fighter_type: "MMA",
    gym: "",
  });

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (isLogin) {
        const response = await axios.post(`${API}/auth/login`, {
          email: formData.email,
          password: formData.password,
        });
        login(response.data.user, response.data.token);
        toast.success("Welcome back, fighter!");
      } else {
        const response = await axios.post(`${API}/auth/register`, formData);
        login(response.data.user, response.data.token);
        toast.success("Welcome to FightNet!");
      }
    } catch (error) {
      toast.error(error.response?.data?.detail || "Authentication failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-fight-black flex items-center justify-center p-4 relative overflow-hidden">
      {/* Background Image */}
      <div
        className="absolute inset-0 bg-cover bg-center opacity-30"
        style={{
          backgroundImage:
            "url('https://customer-assets.emergentagent.com/job_knockout-social/artifacts/7jvct5r5_BCO.e35ed3b9-a56d-4cb0-909b-21f64c74cd9f.png')",
        }}
      />
      <div className="absolute inset-0 bg-gradient-to-t from-fight-black via-fight-black/80 to-transparent" />

      {/* Auth Card */}
      <div className="relative z-10 w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <h1 className="font-anton text-5xl tracking-wide">
            <span className="text-white">FIGHT</span>
            <span className="text-fight-red">NET</span>
          </h1>
          <p className="text-gray-500 font-barlow mt-2 uppercase tracking-widest text-xs">
            Combat Sports Social Network
          </p>
        </div>

        <div className="bg-fight-charcoal border border-fight-concrete rounded-sm p-8">
          <h2 className="font-anton text-2xl text-white uppercase tracking-wide mb-6 text-center">
            {isLogin ? "ENTER THE RING" : "JOIN THE FIGHT"}
          </h2>

          <form onSubmit={handleSubmit} className="space-y-5">
            {!isLogin && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="first_name" className="text-gray-400 font-barlow uppercase text-xs tracking-wider">
                    Fighter Name
                  </Label>
                  <Input
                    id="first_name"
                    name="first_name"
                    type="text"
                    value={formData.first_name}
                    onChange={handleChange}
                    required={!isLogin}
                    className="bg-black border-fight-concrete focus:border-fight-red h-12 text-white placeholder:text-gray-600"
                    placeholder="Your name"
                    data-testid="input-first-name"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="username" className="text-gray-400 font-barlow uppercase text-xs tracking-wider">
                    Username
                  </Label>
                  <Input
                    id="username"
                    name="username"
                    type="text"
                    value={formData.username}
                    onChange={handleChange}
                    required={!isLogin}
                    className="bg-black border-fight-concrete focus:border-fight-red h-12 text-white placeholder:text-gray-600"
                    placeholder="@username"
                    data-testid="input-username"
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-gray-400 font-barlow uppercase text-xs tracking-wider">
                    Fighting Style
                  </Label>
                  <Select
                    value={formData.fighter_type}
                    onValueChange={(value) => setFormData({ ...formData, fighter_type: value })}
                  >
                    <SelectTrigger className="bg-black border-fight-concrete h-12 text-white" data-testid="select-fighter-type">
                      <SelectValue placeholder="Select style" />
                    </SelectTrigger>
                    <SelectContent className="bg-fight-charcoal border-fight-concrete">
                      <SelectItem value="MMA" className="text-white focus:bg-fight-concrete">MMA</SelectItem>
                      <SelectItem value="Boxing" className="text-white focus:bg-fight-concrete">Boxing</SelectItem>
                      <SelectItem value="Muay Thai" className="text-white focus:bg-fight-concrete">Muay Thai</SelectItem>
                      <SelectItem value="BJJ" className="text-white focus:bg-fight-concrete">Brazilian Jiu-Jitsu</SelectItem>
                      <SelectItem value="Wrestling" className="text-white focus:bg-fight-concrete">Wrestling</SelectItem>
                      <SelectItem value="Kickboxing" className="text-white focus:bg-fight-concrete">Kickboxing</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="gym" className="text-gray-400 font-barlow uppercase text-xs tracking-wider">
                    Gym / Team (Optional)
                  </Label>
                  <Input
                    id="gym"
                    name="gym"
                    type="text"
                    value={formData.gym}
                    onChange={handleChange}
                    className="bg-black border-fight-concrete focus:border-fight-red h-12 text-white placeholder:text-gray-600"
                    placeholder="Your gym or team"
                    data-testid="input-gym"
                  />
                </div>
              </>
            )}

            <div className="space-y-2">
              <Label htmlFor="email" className="text-gray-400 font-barlow uppercase text-xs tracking-wider">
                Email
              </Label>
              <Input
                id="email"
                name="email"
                type="email"
                value={formData.email}
                onChange={handleChange}
                required
                className="bg-black border-fight-concrete focus:border-fight-red h-12 text-white placeholder:text-gray-600"
                placeholder="fighter@example.com"
                data-testid="input-email"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password" className="text-gray-400 font-barlow uppercase text-xs tracking-wider">
                Password
              </Label>
              <Input
                id="password"
                name="password"
                type="password"
                value={formData.password}
                onChange={handleChange}
                required
                className="bg-black border-fight-concrete focus:border-fight-red h-12 text-white placeholder:text-gray-600"
                placeholder="••••••••"
                data-testid="input-password"
              />
            </div>

            <Button
              type="submit"
              disabled={loading}
              className="w-full bg-fight-red hover:bg-red-700 text-white font-barlow font-bold uppercase tracking-wider h-12 rounded-sm shadow-[0_0_15px_rgba(220,38,38,0.4)] hover:shadow-[0_0_25px_rgba(220,38,38,0.6)] transition-all"
              data-testid="submit-btn"
            >
              {loading ? "Loading..." : isLogin ? "FIGHT" : "JOIN"}
            </Button>
          </form>

          <div className="mt-6 text-center">
            <button
              onClick={() => setIsLogin(!isLogin)}
              className="text-gray-500 hover:text-fight-red font-barlow text-sm transition-colors"
              data-testid="toggle-auth-mode"
            >
              {isLogin ? "New fighter? " : "Already a fighter? "}
              <span className="text-fight-red font-semibold uppercase">
                {isLogin ? "Join the fight" : "Enter the ring"}
              </span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
