import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";

const Profile = () => {
  const { email } = useAuth();
  const [name, setName] = useState("");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const run = async () => {
      if (!email) return;
      try {
        const res = await fetch(`/api/profile?email=${encodeURIComponent(email)}`);
        if (res.ok) {
          const data = await res.json();
          setName(data.name || "");
          const withBust = data.avatar_url ? `${data.avatar_url}?t=${Date.now()}` : null;
          setAvatarUrl(withBust);
        }
      } catch {}
    };
    run();
  }, [email]);

  const onSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;
    setLoading(true);
    try {
      const res = await fetch("/api/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, name: name || null }),
      });
      if (!res.ok) throw new Error("Failed to update profile");
      if (avatarFile) {
        const form = new FormData();
        form.append("email", email);
        form.append("avatar", avatarFile);
        const up = await fetch("/api/profile/avatar", { method: "POST", body: form });
        if (!up.ok) {
          const err = await up.json().catch(() => ({}));
          throw new Error(err.error || "Failed to upload avatar");
        }
        const u = await up.json();
        const withBust = u.avatar_url ? `${u.avatar_url}?t=${Date.now()}` : null;
        setAvatarUrl(withBust);
        setAvatarFile(null);
      }
      toast({ title: "Profile updated" });
    } catch (e: any) {
      toast({ title: "Update error", description: String(e.message || e), variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <Card className="w-full max-w-md p-6 space-y-6">
        <div className="text-center space-y-2">
          <h1 className="text-2xl font-bold">Your Profile</h1>
          <p className="text-muted-foreground text-sm">Update your name and photo</p>
        </div>

        <form onSubmit={onSave} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Name</Label>
            <Input id="name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Your name" />
          </div>
          <div className="space-y-2">
            <Label>Current photo</Label>
            <div className="flex items-center gap-4">
              {avatarUrl ? (
                <img src={avatarUrl} alt="Avatar" className="h-16 w-16 rounded-full object-cover border" />
              ) : (
                <div className="h-16 w-16 rounded-full bg-muted border" />
              )}
              <div className="flex-1" />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="avatar">Change photo</Label>
            <Input id="avatar" type="file" accept="image/*" onChange={(e) => setAvatarFile(e.target.files?.[0] || null)} />
          </div>
          <Button type="submit" className="w-full" disabled={loading || !email}>
            {loading ? "Saving..." : "Save changes"}
          </Button>
        </form>
      </Card>
    </div>
  );
};

export default Profile;


