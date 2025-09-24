import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useNavigate, Link } from "react-router-dom";
import { toast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";

const Signup = () => {
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [avatar, setAvatar] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (!email || !password) {
        toast({ title: "Missing fields", description: "Please enter email and password", variant: "destructive" });
        return;
      }
      const res = await fetch("/api/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim().toLowerCase(), password, name: name || undefined }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Signup failed");
      }
      const data = await res.json();
      if (avatar) {
        const form = new FormData();
        form.append("email", data.email);
        form.append("avatar", avatar);
        const uploadRes = await fetch("/api/profile/avatar", { method: "POST", body: form });
        if (uploadRes.ok) {
          const up = await uploadRes.json();
          data.avatar_url = up.avatar_url;
        }
      }
      login(data.email, data.token);
      toast({ title: "Account created", description: "Welcome to Budget Scan & Pay" });
      navigate("/");
    } catch (e: any) {
      toast({ title: "Signup error", description: String(e.message || e), variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <Card className="w-full max-w-md p-6 space-y-6">
        <div className="text-center space-y-2">
          <h1 className="text-2xl font-bold">Create your account</h1>
          <p className="text-muted-foreground text-sm">It takes less than a minute</p>
        </div>

        <form onSubmit={onSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Name</Label>
            <Input id="name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Your name" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="avatar">Profile picture (optional)</Label>
            <Input id="avatar" type="file" accept="image/*" onChange={(e) => setAvatar(e.target.files?.[0] || null)} />
          </div>
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? "Creating..." : "Create account"}
          </Button>
        </form>

        <div className="text-center text-sm text-muted-foreground">
          <span>Already have an account? </span>
          <Link to="/login" className="text-primary underline">Sign in</Link>
        </div>
      </Card>
    </div>
  );
};

export default Signup;







