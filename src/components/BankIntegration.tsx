import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Building2, Shield, Link, AlertCircle, CheckCircle } from "lucide-react";
import { toast } from "@/hooks/use-toast";

interface BankAccount {
  id: string;
  name: string;
  type: string;
  balance: number;
  connected: boolean;
  lastSync: string;
}

export const BankIntegration = () => {
  const [accounts, setAccounts] = useState<BankAccount[]>([
    {
      id: "1",
      name: "Chase Checking",
      type: "Checking",
      balance: 2450.32,
      connected: true,
      lastSync: "2024-01-15 10:30 AM"
    },
    {
      id: "2", 
      name: "Wells Fargo Savings",
      type: "Savings",
      balance: 5680.50,
      connected: true,
      lastSync: "2024-01-15 10:30 AM"
    }
  ]);

  const [availableBanks] = useState([
    { name: "Bank of America", logo: "🏦", supported: true },
    { name: "Capital One", logo: "🏛️", supported: true },
    { name: "Citibank", logo: "🏢", supported: true },
    { name: "American Express", logo: "💳", supported: true },
    { name: "Local Credit Union", logo: "🏛️", supported: false }
  ]);

  const handleBankConnection = (bankName: string) => {
    toast({
      title: "Bank Integration Required",
      description: "Please connect to Supabase backend to enable secure bank connections",
      variant: "destructive",
    });
  };

  const syncAccount = (accountId: string) => {
    setAccounts(accounts.map(account => 
      account.id === accountId 
        ? { ...account, lastSync: new Date().toLocaleString() }
        : account
    ));
    
    toast({
      title: "Account Synced",
      description: "Latest transactions have been imported",
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center">
        <h2 className="text-2xl font-bold mb-2">Bank Integration</h2>
        <p className="text-muted-foreground">
          Connect your accounts for automatic expense tracking
        </p>
      </div>

      {/* Security Notice */}
      <Card className="p-4 border-accent/20 bg-accent/5">
        <div className="flex items-start space-x-3">
          <Shield className="h-5 w-5 text-accent mt-0.5" />
          <div>
            <h4 className="font-semibold text-accent">Bank-Level Security</h4>
            <p className="text-sm text-muted-foreground mt-1">
              We use 256-bit encryption and read-only access to protect your financial data
            </p>
          </div>
        </div>
      </Card>

      {/* Connected Accounts */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4">Connected Accounts</h3>
        
        {accounts.length > 0 ? (
          <div className="space-y-4">
            {accounts.map((account) => (
              <div key={account.id} className="flex items-center justify-between p-4 bg-muted/30 rounded-lg">
                <div className="flex items-center space-x-3">
                  <div className="p-2 bg-primary/10 rounded-full">
                    <Building2 className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <div className="flex items-center space-x-2">
                      <h4 className="font-medium">{account.name}</h4>
                      <Badge variant={account.connected ? "default" : "secondary"}>
                        {account.connected ? "Connected" : "Disconnected"}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {account.type} • Last sync: {account.lastSync}
                    </p>
                  </div>
                </div>
                
                <div className="text-right space-y-2">
                  <p className="font-semibold">${account.balance.toFixed(2)}</p>
                  <Button 
                    size="sm" 
                    variant="outline"
                    onClick={() => syncAccount(account.id)}
                  >
                    Sync Now
                  </Button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8 text-muted-foreground">
            <Building2 className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <p>No accounts connected yet</p>
          </div>
        )}
      </Card>

      {/* Available Banks */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4">Connect New Bank</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {availableBanks.map((bank) => (
            <div key={bank.name} className="flex items-center justify-between p-4 border rounded-lg">
              <div className="flex items-center space-x-3">
                <span className="text-2xl">{bank.logo}</span>
                <div>
                  <h4 className="font-medium">{bank.name}</h4>
                  <div className="flex items-center space-x-1">
                    {bank.supported ? (
                      <>
                        <CheckCircle className="h-3 w-3 text-success" />
                        <span className="text-xs text-success">Supported</span>
                      </>
                    ) : (
                      <>
                        <AlertCircle className="h-3 w-3 text-warning" />
                        <span className="text-xs text-warning">Coming Soon</span>
                      </>
                    )}
                  </div>
                </div>
              </div>
              
              <Button
                size="sm"
                variant={bank.supported ? "default" : "secondary"}
                disabled={!bank.supported}
                onClick={() => handleBankConnection(bank.name)}
              >
                <Link className="h-4 w-4 mr-2" />
                {bank.supported ? "Connect" : "Soon"}
              </Button>
            </div>
          ))}
        </div>
      </Card>

      {/* Features */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4">What You Get</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <h4 className="font-medium">✅ Automatic Transaction Import</h4>
            <p className="text-sm text-muted-foreground">
              All purchases automatically appear in your expense tracker
            </p>
          </div>
          
          <div className="space-y-2">
            <h4 className="font-medium">✅ Smart Categorization</h4>
            <p className="text-sm text-muted-foreground">
              AI-powered expense categorization with learning capabilities
            </p>
          </div>
          
          <div className="space-y-2">
            <h4 className="font-medium">✅ Real-time Balance Updates</h4>
            <p className="text-sm text-muted-foreground">
              Always know your current account balances across all banks
            </p>
          </div>
          
          <div className="space-y-2">
            <h4 className="font-medium">✅ Budget Alerts</h4>
            <p className="text-sm text-muted-foreground">
              Get notified when you're approaching your spending limits
            </p>
          </div>
        </div>
      </Card>
    </div>
  );
};