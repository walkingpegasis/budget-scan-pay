import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { PlusCircle, Camera, CreditCard, TrendingUp, TrendingDown, Wallet } from "lucide-react";
import { toast } from "@/hooks/use-toast";

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
  const [expenses, setExpenses] = useState<Expense[]>([
    { id: "1", amount: 45.20, category: "Food & Dining", description: "Lunch at cafe", date: "2024-01-15" },
    { id: "2", amount: 12.50, category: "Transportation", description: "Bus fare", date: "2024-01-15" },
    { id: "3", amount: 89.99, category: "Shopping", description: "Groceries", date: "2024-01-14" },
  ]);

  const [budgets, setBudgets] = useState<Budget[]>([
    { category: "Food & Dining", limit: 500, spent: 45.20 },
    { category: "Transportation", limit: 200, spent: 12.50 },
    { category: "Shopping", limit: 300, spent: 89.99 },
  ]);

  const [newExpense, setNewExpense] = useState({
    amount: "",
    category: "",
    description: "",
  });

  const totalSpent = expenses.reduce((sum, expense) => sum + expense.amount, 0);
  const totalBudget = budgets.reduce((sum, budget) => sum + budget.limit, 0);

  const addExpense = () => {
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
      date: new Date().toISOString().split('T')[0],
    };

    setExpenses([expense, ...expenses]);
    
    // Update budget spent amount
    setBudgets(budgets.map(budget => 
      budget.category === expense.category
        ? { ...budget, spent: budget.spent + expense.amount }
        : budget
    ));

    setNewExpense({ amount: "", category: "", description: "" });
    
    toast({
      title: "Expense Added",
      description: `$${expense.amount} expense added successfully`,
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
              <p className="text-sm text-muted-foreground">Total Budget</p>
              <p className="text-2xl font-bold">${totalBudget.toFixed(2)}</p>
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
              <p className="text-2xl font-bold">${totalSpent.toFixed(2)}</p>
            </div>
          </div>
        </Card>

        <Card className="p-6 bg-gradient-to-br from-card to-muted/20 shadow-lg">
          <div className="flex items-center space-x-3">
            <div className="p-3 bg-success/10 rounded-full">
              <TrendingUp className="h-6 w-6 text-success" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Remaining</p>
              <p className="text-2xl font-bold">${(totalBudget - totalSpent).toFixed(2)}</p>
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
              <div>
                <Label htmlFor="description">Description</Label>
                <Input
                  id="description"
                  placeholder="What did you buy?"
                  value={newExpense.description}
                  onChange={(e) => setNewExpense({ ...newExpense, description: e.target.value })}
                />
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
                  ${budget.spent.toFixed(2)} / ${budget.limit.toFixed(2)}
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

      {/* Recent Expenses */}
      <Card className="p-6">
        <h2 className="text-xl font-semibold mb-4">Recent Expenses</h2>
        <div className="space-y-3">
          {expenses.slice(0, 5).map((expense) => (
            <div key={expense.id} className="flex justify-between items-center p-3 bg-muted/30 rounded-lg">
              <div>
                <p className="font-medium">{expense.description}</p>
                <p className="text-sm text-muted-foreground">{expense.category} • {expense.date}</p>
              </div>
              <p className="font-semibold text-destructive">-${expense.amount.toFixed(2)}</p>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
};