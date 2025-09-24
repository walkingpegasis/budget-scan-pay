import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ExpenseTracker } from "@/components/ExpenseTracker";
import { ScanPayFeature } from "@/components/ScanPayFeature";
import { Wallet, Camera, LogIn, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/use-auth";

const HeaderAuthActions = () => {
  const { email, logout } = useAuth();
  const navigate = useNavigate();
  if (email) {
    return (
      <div className="flex justify-end mb-4">
        <div className="flex items-center gap-3">
          <span className="text-sm text-muted-foreground">{email}</span>
          <Button size="sm" variant="secondary" onClick={() => navigate('/profile')}>
            <User className="h-4 w-4 mr-2" /> Profile
          </Button>
          <Button size="sm" variant="outline" onClick={() => { logout(); navigate('/login'); }}>
            Logout
          </Button>
        </div>
      </div>
    );
  }
  return (
    <div className="flex justify-end mb-4">
      <Link to="/login">
        <Button size="sm" variant="outline">
          <LogIn className="h-4 w-4 mr-2" />
          Login
        </Button>
      </Link>
    </div>
  );
};

const Index = () => {
  const [activeTab, setActiveTab] = useState("tracker");

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-6">
        <HeaderAuthActions />
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2 mb-6">
            <TabsTrigger value="tracker" className="flex items-center space-x-2">
              <Wallet className="h-4 w-4" />
              <span>Expenses</span>
            </TabsTrigger>
            <TabsTrigger value="scan-pay" className="flex items-center space-x-2">
              <Camera className="h-4 w-4" />
              <span>Scan & Pay</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="tracker">
            <ExpenseTracker />
          </TabsContent>

          <TabsContent value="scan-pay">
            <ScanPayFeature />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default Index;
