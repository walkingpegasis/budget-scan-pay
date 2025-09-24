import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { PlusCircle, Camera, CreditCard, TrendingUp, TrendingDown, Wallet } from "lucide-react";
import { ExportDialog } from "@/components/ExportDialog";
import { toast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";

interface Expense {
  id: string;
  amount: number;
  category: string;
  description: string;
  date: string;
}

interface Budget {
  category: string;
  limit: number;
  spent: number;
}

const categories = [
  "Food & Dining", "Transportation", "Shopping", "Entertainment", 
  "Bills & Utilities", "Health & Fitness", "Travel", "Other"
];

export const ExpenseTracker = () => {
  const { email } = useAuth();
  const [expenses, setExpenses] = useState<Expense[]>([]);

  const [budgets, setBudgets] = useState<Budget[]>([]);

  const [newExpense, setNewExpense] = useState({
    amount: "",
    category: "",
    description: "",
    date: new Date().toISOString().split('T')[0],
  });

  const [newBudget, setNewBudget] = useState({
    category: "",
    limit: "",
  });

  const [totalFunds, setTotalFunds] = useState<number>(0);
  const totalSpent = expenses.reduce((sum, expense) => sum + expense.amount, 0);
  const totalBudget = budgets.reduce((sum, budget) => sum + budget.limit, 0);
  const [filters, setFilters] = useState({ from: '', to: '' });
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [limit] = useState(20);

  const addExpense = async () => {
    if (!newExpense.amount || !newExpense.category || !newExpense.description) {
      toast({
        title: "Error",
        description: "Please fill in all fields",
        variant: "destructive",
      });
      return;
    }

    const expense: Expense = {
      id: Date.now().toString(),
      amount: parseFloat(newExpense.amount),
      category: newExpense.category,
      description: newExpense.description,
      date: newExpense.date || new Date().toISOString().split('T')[0],
    };

    setExpenses([expense, ...expenses]);
    // persist expense and update budget server-side
    if (email) {
      try {
        await fetch('/api/expenses', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email,
            amount: expense.amount,
            category: expense.category,
            description: expense.description,
            date: expense.date,
          }),
        });
        // optimistic local spent update
        setBudgets(budgets.map(budget => 
          budget.category === expense.category
            ? { ...budget, spent: budget.spent + expense.amount }
            : budget
        ));

        // alerts: budget overspend
        const matchingBudget = budgets.find(b => b.category === expense.category);
        if (matchingBudget) {
          const newSpentForCategory = matchingBudget.spent + expense.amount;
          if (newSpentForCategory > matchingBudget.limit) {
            toast({
              title: 'Budget exceeded',
              description: `${expense.category} spent ${inr(newSpentForCategory)} of ${inr(matchingBudget.limit)}`,
              variant: 'destructive',
            });
          }
        }

        // alerts: total funds overspend
        const newTotalSpent = totalSpent + expense.amount;
        if (totalFunds > 0 && newTotalSpent > totalFunds) {
          toast({
            title: 'Insufficient funds',
            description: `Spending ${inr(newTotalSpent)} exceeds your total funds ${inr(totalFunds)}`,
            variant: 'destructive',
          });
        }
      } catch (e) {
        console.error(e);
      }
    }

    setNewExpense({ amount: "", category: "", description: "", date: new Date().toISOString().split('T')[0] });
    
    toast({
      title: 'Expense Added',
      description: `${inr(expense.amount)} added successfully`,
    });
  };

  const getBudgetProgress = (budget: Budget) => {
    return Math.min((budget.spent / budget.limit) * 100, 100);
  };

  const getBudgetStatus = (budget: Budget) => {
    const percentage = (budget.spent / budget.limit) * 100;
    if (percentage >= 90) return "over";
    if (percentage >= 75) return "warning";
    return "good";
  };

  const updateBudgetLimit = (category: string, newLimitValue: string) => {
    const parsed = parseFloat(newLimitValue || "0");
    setBudgets(budgets.map(budget =>
      budget.category === category
        ? { ...budget, limit: isNaN(parsed) ? budget.limit : parsed }
        : budget
    ));
    if (email && !isNaN(parsed)) {
      fetch(`/api/budgets/${encodeURIComponent(category)}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, limit: parsed }),
      }).catch(() => {});
    }
  };

  const addBudget = () => {
    if (!newBudget.category || !newBudget.limit) {
      toast({
        title: "Error",
        description: "Select a category and enter a limit",
        variant: "destructive",
      });
      return;
    }
    if (budgets.some(b => b.category === newBudget.category)) {
      toast({
        title: "Duplicate Category",
        description: "This category already has a budget",
        variant: "destructive",
      });
      return;
    }
    const parsedLimit = parseFloat(newBudget.limit);
    if (isNaN(parsedLimit) || parsedLimit <= 0) {
      toast({
        title: "Invalid Limit",
        description: "Enter a valid positive number",
        variant: "destructive",
      });
      return;
    }
    setBudgets([...budgets, { category: newBudget.category, limit: parsedLimit, spent: 0 }]);
    setNewBudget({ category: "", limit: "" });
    toast({ title: "Budget Added", description: "New budget configured" });
    if (email) {
      fetch('/api/budgets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, category: newBudget.category, limit: parsedLimit }),
      }).catch(() => {});
    }
  };

  useEffect(() => {
    if (!email) return;
    (async () => {
      try {
        const res = await fetch(`/api/budgets?email=${encodeURIComponent(email)}`);
        if (res.ok) {
          const data = await res.json();
          setBudgets(Array.isArray(data) ? data : []);
        }
        const walletRes = await fetch(`/api/wallet?email=${encodeURIComponent(email)}`);
        if (walletRes.ok) {
          const w = await walletRes.json();
          setTotalFunds(Number(w.total_funds || 0));
        }
        const qs = new URLSearchParams({ email, page: String(page), limit: String(limit) });
        if (filters.from) qs.set('from', filters.from);
        if (filters.to) qs.set('to', filters.to);
        const expRes = await fetch(`/api/expenses?${qs.toString()}`);
        if (expRes.ok) {
          const data = await expRes.json();
          const list = Array.isArray(data.items) ? data.items : [];
          setExpenses(list.map((x: any) => ({
            id: String(x.id || Date.now()),
            amount: Number(x.amount),
            category: String(x.category),
            description: String(x.description),
            date: String(x.date).split('T')[0],
          })));
          setTotal(Number(data.total || 0));
        }
      } catch (e) {
        console.error(e);
      }
    })();
  }, [email, page, filters.from, filters.to]);

  const saveTotalFunds = async () => {
    if (!email) return;
    try {
      await fetch('/api/wallet', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, total_funds: totalFunds }),
      });
      toast({ title: 'Saved', description: 'Total funds updated' });
    } catch (e) {
      console.error(e);
    }
  };

  const inr = (value: number) =>
    new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 2 }).format(value);

  return (
    <div className="min-h-screen bg-background p-4 space-y-6">
      {/* Header */}
      <div className="text-center py-6">
        <h1 className="text-4xl font-bold bg-gradient-to-r from-primary to-primary-glow bg-clip-text text-transparent">
          ExpenseTracker Pro
        </h1>
        <p className="text-muted-foreground mt-2">Smart expense tracking with budget insights</p>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="p-6 bg-gradient-to-br from-card to-muted/20 shadow-lg">
          <div className="flex items-center space-x-3">
            <div className="p-3 bg-primary/10 rounded-full">
              <Wallet className="h-6 w-6 text-primary" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Total Funds</p>
              <div className="flex items-center gap-2">
                <Input
                  type="number"
                  value={totalFunds}
                  onChange={(e) => setTotalFunds(parseFloat(e.target.value || '0'))}
                  className="w-32 h-8"
                />
                <Button size="sm" onClick={saveTotalFunds}>Save</Button>
              </div>
            </div>
          </div>
        </Card>

        <Card className="p-6 bg-gradient-to-br from-card to-muted/20 shadow-lg">
          <div className="flex items-center space-x-3">
            <div className="p-3 bg-destructive/10 rounded-full">
              <TrendingDown className="h-6 w-6 text-destructive" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Total Spent</p>
              <p className="text-2xl font-bold">{inr(totalSpent)}</p>
            </div>
          </div>
        </Card>

        <Card className="p-6 bg-gradient-to-br from-card to-muted/20 shadow-lg">
          <div className="flex items-center space-x-3">
            <div className="p-3 bg-success/10 rounded-full">
              <TrendingUp className="h-6 w-6 text-success" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Remaining Funds</p>
              <p className="text-2xl font-bold">{inr(Math.max(totalFunds - totalSpent, 0))}</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Action Buttons */}
      <div className="flex flex-wrap gap-3 justify-center">
        <Dialog>
          <DialogTrigger asChild>
            <Button className="bg-gradient-to-r from-primary to-primary-glow hover:shadow-lg transition-all">
              <PlusCircle className="h-4 w-4 mr-2" />
              Add Expense
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add New Expense</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="amount">Amount</Label>
                <Input
                  id="amount"
                  type="number"
                  placeholder="0.00"
                  value={newExpense.amount}
                  onChange={(e) => setNewExpense({ ...newExpense, amount: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="category">Category</Label>
                <Select onValueChange={(value) => setNewExpense({ ...newExpense, category: value })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((category) => (
                      <SelectItem key={category} value={category}>
                        {category}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="description">Description</Label>
                  <Input
                    id="description"
                    placeholder="What did you buy?"
                    value={newExpense.description}
                    onChange={(e) => setNewExpense({ ...newExpense, description: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="date">Date</Label>
                  <Input
                    id="date"
                    type="date"
                    value={new Date().toISOString().split('T')[0]}
                    onChange={(e) => setNewExpense({ ...newExpense, date: e.target.value }) as any}
                  />
                </div>
              </div>
              <Button onClick={addExpense} className="w-full">
                Add Expense
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        <Button variant="outline" className="border-accent text-accent hover:bg-accent hover:text-accent-foreground">
          <Camera className="h-4 w-4 mr-2" />
          Scan Receipt
        </Button>

        <Button variant="outline" className="border-secondary text-secondary hover:bg-secondary hover:text-secondary-foreground">
          <CreditCard className="h-4 w-4 mr-2" />
          Quick Pay
        </Button>

        {/* Manage Budgets */}
        <Dialog>
          <DialogTrigger asChild>
            <Button variant="outline">
              Manage Budgets
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Manage Budgets</DialogTitle>
            </DialogHeader>
            <div className="space-y-6">
              <div className="space-y-3">
                {budgets.map((budget) => (
                  <div key={budget.category} className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-center">
                    <div className="sm:col-span-1">
                      <Label>{budget.category}</Label>
                    </div>
                    <div className="sm:col-span-1">
                      <Label className="text-sm text-muted-foreground">Limit</Label>
                      <Input
                        type="number"
                        value={budget.limit}
                        onChange={(e) => updateBudgetLimit(budget.category, e.target.value)}
                      />
                    </div>
                    <div className="sm:col-span-1 text-sm text-muted-foreground">
                      Spent: {inr(budget.spent)}
                    </div>
                  </div>
                ))}
              </div>

              <div className="border-t pt-4 space-y-3">
                <h4 className="font-medium">Add New Budget</h4>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-end">
                  <div>
                    <Label>Category</Label>
                    <Select value={newBudget.category} onValueChange={(value) => setNewBudget({ ...newBudget, category: value })}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select category" />
                      </SelectTrigger>
                      <SelectContent>
                        {categories
                          .filter((c) => !budgets.some((b) => b.category === c))
                          .map((category) => (
                            <SelectItem key={category} value={category}>
                              {category}
                            </SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Limit</Label>
                    <Input
                      type="number"
                      placeholder="0.00"
                      value={newBudget.limit}
                      onChange={(e) => setNewBudget({ ...newBudget, limit: e.target.value })}
                    />
                  </div>
                  <div>
                    <Button onClick={addBudget} className="w-full">Add</Button>
                  </div>
                </div>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Export */}
        <ExportDialog />
      </div>

      {/* Budget Progress */}
      <Card className="p-6">
        <h2 className="text-xl font-semibold mb-4">Budget Overview</h2>
        <div className="space-y-4">
          {budgets.map((budget) => (
            <div key={budget.category} className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="font-medium">{budget.category}</span>
                <span className="text-sm text-muted-foreground">
                  {inr(budget.spent)} / {inr(budget.limit)}
                </span>
              </div>
              <div className="w-full bg-muted rounded-full h-2">
                <div
                  className={`h-2 rounded-full transition-all ${
                    getBudgetStatus(budget) === "over"
                      ? "bg-destructive"
                      : getBudgetStatus(budget) === "warning"
                      ? "bg-warning"
                      : "bg-success"
                  }`}
                  style={{ width: `${getBudgetProgress(budget)}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* Statement */}
      <Card className="p-6">
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3 mb-4">
          <h2 className="text-xl font-semibold">Statement</h2>
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-2 w-full sm:w-auto">
            <div>
              <Label>From</Label>
              <Input type="date" value={filters.from} onChange={(e) => { setPage(1); setFilters({ ...filters, from: e.target.value }); }} />
            </div>
            <div>
              <Label>To</Label>
              <Input type="date" value={filters.to} onChange={(e) => { setPage(1); setFilters({ ...filters, to: e.target.value }); }} />
            </div>
            <div className="sm:col-span-2 flex items-end gap-2">
              <Button variant="outline" onClick={() => { setFilters({ from: '', to: '' }); setPage(1); }}>Clear</Button>
              <Button onClick={() => setPage(1)}>Apply</Button>
            </div>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-muted-foreground">
              <tr>
                <th className="text-left py-2 pr-4">Date</th>
                <th className="text-left py-2 pr-4">Description</th>
                <th className="text-left py-2 pr-4">Category</th>
                <th className="text-right py-2">Amount</th>
              </tr>
            </thead>
            <tbody>
              {expenses.map((expense) => (
                <tr key={expense.id} className="border-b last:border-0">
                  <td className="py-2 pr-4">{expense.date}</td>
                  <td className="py-2 pr-4">{expense.description}</td>
                  <td className="py-2 pr-4">{expense.category}</td>
                  <td className="py-2 text-right text-destructive">{inr(expense.amount)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="flex items-center justify-between mt-4 text-sm">
          <span className="text-muted-foreground">Page {page} of {Math.max(1, Math.ceil(total / limit))}</span>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>Prev</Button>
            <Button variant="outline" size="sm" disabled={page >= Math.ceil(total / limit)} onClick={() => setPage((p) => p + 1)}>Next</Button>
          </div>
        </div>
      </Card>
    </div>
  );
};