"use client";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { useMemo, useEffect, useState } from "react";
import { toast } from "sonner";
import { customRevalidatePath } from "@/utils/customRevalidatePath";
import { Transaction } from "@prisma/client";
import { useSession } from "next-auth/react";

// FORM COMPONENTS
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CalendarIcon } from "@radix-ui/react-icons";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import {
  EXPENSE_CATEGORIES,
  EXPENSE_CATEGORIES_KEYS,
  INCOME_CATEGORIES,
  INCOME_CATEGORIES_KEYS,
} from "@/lib/categories";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Calendar } from "@/components/ui/calendar";
import { Textarea } from "@/components/ui/textarea";
import { createTransaction } from "@/lib/api/transactions";
import { getAllUserAccountsByUserId } from "@/lib/api/accounts";

const formSchema = z.object({
  account: z.string().min(1),
  type: z.enum(["expense", "income"]),
  description: z.string().min(1),
  category: z.string().min(1),
  date: z.date(),
  amount: z.number().positive(),
  notes: z.string().optional(),
});

export default function TransactionForm({
  initialData,
  closeSheetCallback,
}: {
  initialData: Transaction | undefined;
  closeSheetCallback: () => void;
}) {
  const { data: session } = useSession();
  const userId = session?.user?.id;

  const [accounts, setAccounts] = useState<any[]>([]);
  const [defaultAccount, setDefaultAccount] = useState<any | null>(null);
  const [showCalendar, setShowCalendar] = useState(false);
  const [type, setType] = useState<"expense" | "income">("expense");

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: useMemo(
      () => ({
        account: initialData?.UserAccountId || "",
        type: initialData?.type || "expense",
        category: initialData?.category || "",
        description: initialData?.description || "",
        date: new Date(),
        amount: initialData?.amount || 0,
        notes: initialData?.notes || "",
      }),
      [initialData, defaultAccount],
    ),
  });

  // Fetch all accounts and set form account option to default account
  useEffect(() => {
    if (userId) {
      const fetchAccountsAndDefaultAccount = async () => {
        try {
          const fetchedAccounts = await getAllUserAccountsByUserId(userId);
          setAccounts(fetchedAccounts);

          const defaultAcc = fetchedAccounts.find(
            (account) => account.isDefault === true,
          );
          setDefaultAccount(defaultAcc || null);

          // Update form account value to defaultAccount.id
          form.setValue("account", defaultAcc?.id ?? "");
        } catch (error) {
          console.error("Error fetching accounts:", error);
        }
      };

      fetchAccountsAndDefaultAccount();
    }
  }, [userId, form, setAccounts, setDefaultAccount]);

  async function onSubmit(values: z.infer<typeof formSchema>) {
    try {
      const response = await createTransaction({
        UserAccountId: values.account,
        type: values.type,
        description: values.description,
        category: values.category,
        date: values.date,
        amount: values.amount,
        notes: values.notes,
      });
      if (response.success) {
        toast.success("Transaction created successfully");
        customRevalidatePath("/transactions");
        closeSheetCallback();
      } else if (response.error) {
        toast.error(response.error);
      } else {
        toast.error("Failed to create transaction!");
      }
    } catch (error) {
      console.error("Error submitting transaction:", error);
    }
  }

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(onSubmit)}
        className="space-y-8"
        noValidate
      >
        <div className="space-y-6">
          <div className="flex w-full gap-2">
            <Button
              type="button"
              className="w-full"
              variant={type === "expense" ? "default" : "ghost"}
              onClick={() => {
                setType("expense");
                form.setValue("type", "expense");
              }}
            >
              Expense
            </Button>

            <Button
              type="button"
              className="w-full"
              variant={type === "income" ? "default" : "ghost"}
              onClick={() => {
                setType("income");
                form.setValue("type", "income");
              }}
            >
              Income
            </Button>
          </div>

          <FormField
            control={form.control}
            name="description"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="font-medium text-primary">
                  Description
                </FormLabel>
                <FormControl>
                  <Input
                    placeholder={
                      type === "expense"
                        ? "e.g. Groceries, Rent, etc."
                        : "e.g. Salary, Bonus, etc."
                    }
                    {...field}
                    autoComplete="false"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* {(type === "expense" || type === "income") && ( */}
          <FormField
            control={form.control}
            name="category"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="font-medium text-primary">
                  Category
                </FormLabel>
                <Select
                  onValueChange={field.onChange}
                  defaultValue={field.value}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a category" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {(type === "expense"
                      ? EXPENSE_CATEGORIES_KEYS
                      : INCOME_CATEGORIES_KEYS
                    ).map((category) => (
                      <SelectItem key={category} value={category}>
                        {
                          (type === "expense"
                            ? EXPENSE_CATEGORIES
                            : INCOME_CATEGORIES)[category]
                        }
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
          {/* )} */}

          <FormField
            control={form.control}
            name="date"
            render={({ field }) => (
              <FormItem className="flex flex-col">
                <FormLabel className="font-medium text-primary">Date</FormLabel>
                <Popover open={showCalendar} onOpenChange={setShowCalendar}>
                  <PopoverTrigger asChild>
                    <FormControl>
                      <Button
                        variant={"outline"}
                        className={cn(
                          "w-full pl-3 text-left font-normal",
                          !field.value && "text-muted-foreground",
                        )}
                      >
                        {field.value ? (
                          format(field.value, "PPP")
                        ) : (
                          <span>Pick a date</span>
                        )}
                        <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                      </Button>
                    </FormControl>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={field.value}
                      onSelect={(date) => {
                        field.onChange(date);
                        setShowCalendar(false);
                      }}
                      disabled={(date) =>
                        date > new Date() || date < new Date("1900-01-01")
                      }
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="account"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="font-medium text-primary">
                  Account
                </FormLabel>
                <Select
                  onValueChange={field.onChange}
                  value={
                    field.value || (defaultAccount ? defaultAccount.id : "")
                  }
                  defaultValue={
                    defaultAccount ? defaultAccount.name : field.value
                  }
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select an account" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {accounts.map((account) => (
                      <SelectItem key={account.id} value={account.id}>
                        {account.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="amount"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="font-medium text-primary">
                  Amount
                </FormLabel>
                <FormControl>
                  <div className="relative w-full">
                    <span className="pointer-events-none absolute inset-y-0 start-0 flex items-center ps-3">
                      $
                    </span>
                    <Input
                      type="number"
                      pattern="[0-9]*\.?[0-9]+"
                      placeholder="Enter amount"
                      className="ps-8"
                      {...field}
                      onChange={(e) => {
                        const parseValue = parseFloat(e.target.value);
                        field.onChange(parseValue);
                      }}
                    />
                  </div>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="notes"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="font-medium text-primary">
                  Notes
                </FormLabel>
                <FormControl>
                  <Textarea placeholder="Comments" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <Button
          type="submit"
          className="w-full bg-secondary text-primary shadow-none hover:bg-secondary/80"
        >
          Create Transaction
        </Button>
      </form>
    </Form>
  );
}
