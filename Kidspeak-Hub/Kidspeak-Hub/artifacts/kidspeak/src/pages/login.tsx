import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useLogin, useGetMe } from "@workspace/api-client-react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";

const loginSchema = z.object({
  email: z.string().min(3, "Please enter your phone number or email"),
  password: z.string().min(1, "Password is required"),
});

type LoginFormValues = z.infer<typeof loginSchema>;

export default function Login() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const { data: user, isLoading: isCheckingAuth } = useGetMe();
  const { mutate: login, isPending } = useLogin();

  const form = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  function getRoleRedirect(role: string) {
    if (role === "admin") return "/dashboard";
    if (role === "teacher") return "/evaluations";
    if (role === "psychologist") return "/behavioral";
    if (role === "accountant") return "/payments";
    return "/students";
  }

  // Redirect already-authenticated users — must be in useEffect, never during render
  useEffect(() => {
    if (user && !isCheckingAuth) {
      setLocation(getRoleRedirect(user.role));
    }
  }, [user, isCheckingAuth]);

  function onSubmit(data: LoginFormValues) {
    login({ data }, {
      onSuccess: (res) => {
        toast({
          title: "Welcome back!",
          description: "Successfully logged in.",
        });
        setLocation(getRoleRedirect(res.user.role));
      },
      onError: (error) => {
        toast({
          title: "Login failed",
          description: error.error || "Please check your credentials and try again.",
          variant: "destructive",
        });
      }
    });
  }

  if (isCheckingAuth || user) return null;

  return (
    <div className="min-h-screen flex">
      {/* Left panel — dark brand blue */}
      <div
        className="hidden md:flex flex-col w-[420px] shrink-0 p-12 relative overflow-hidden"
        style={{ backgroundColor: 'hsl(229, 72%, 17%)' }}
      >
        {/* Decorative circles */}
        <div className="absolute -top-16 -left-16 w-64 h-64 rounded-full opacity-10" style={{ backgroundColor: '#F5A600' }} />
        <div className="absolute -bottom-24 -right-8 w-80 h-80 rounded-full opacity-10" style={{ backgroundColor: '#F5A600' }} />

        <div className="relative z-10 flex-1 flex flex-col justify-between">
          <img src="/logo-accent.png" alt="Kidspeak" className="h-10 w-auto" />

          <div className="space-y-6">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl" style={{ backgroundColor: 'rgba(245,166,0,0.15)' }}>
              <img src="/icon.png" alt="" className="w-10 h-10" />
            </div>
            <h2 className="text-3xl font-bold text-white leading-snug">
              Where progress<br />meets precision.
            </h2>
            <p className="text-white/60 text-base leading-relaxed">
              Track evaluations, visualize student growth, and manage school finances — all in one unified platform.
            </p>
          </div>

          <div className="space-y-3">
            {[
              { role: "Speaking Evaluations", desc: "Weekly confidence & participation tracking" },
              { role: "Progress Charts", desc: "Visual growth timeline for every student" },
              { role: "Financial Management", desc: "Payments, revenue & expense tracking" },
            ].map((f) => (
              <div key={f.role} className="flex items-start gap-3">
                <div className="w-1.5 h-1.5 rounded-full mt-2 shrink-0" style={{ backgroundColor: '#F5A600' }} />
                <div>
                  <div className="text-white text-sm font-medium">{f.role}</div>
                  <div className="text-white/50 text-xs">{f.desc}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right panel — sign in form */}
      <div className="flex-1 flex flex-col justify-center px-8 md:px-16 lg:px-24 bg-background">
        <div className="max-w-sm w-full mx-auto space-y-8">
          {/* Mobile logo */}
          <div className="md:hidden mb-2">
            <img src="/logo-full.png" alt="Kidspeak" className="h-8 w-auto" />
          </div>

          <div className="space-y-1">
            <h1 className="text-2xl font-bold tracking-tight" style={{ color: 'hsl(229, 72%, 25%)' }}>
              Sign in to your account
            </h1>
            <p className="text-muted-foreground text-sm">Enter your credentials to access the portal.</p>
          </div>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Phone or Email</FormLabel>
                    <FormControl>
                      <Input placeholder="0551234567 or name@school.com" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Password</FormLabel>
                    <FormControl>
                      <Input type="password" placeholder="••••••••" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button
                type="submit"
                className="w-full font-semibold"
                style={{ backgroundColor: '#F5A600', color: '#1B2E8F' }}
                disabled={isPending}
              >
                {isPending ? "Signing in..." : "Sign In"}
              </Button>
            </form>
          </Form>

          <div className="border rounded-xl p-4 bg-muted/40 space-y-2">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Demo Credentials</p>
            <div className="space-y-1 text-sm">
              {[
                { role: "Admin", email: "admin@kidspeak.com" },
                { role: "Teacher", email: "sarah@kidspeak.com" },
                { role: "Parent", email: "emma.parent@kidspeak.com" },
                { role: "Psychologist", email: "amina@kidspeak.com" },
                { role: "Accountant", email: "karim@kidspeak.com" },
                { role: "Designer", email: "designer@kidspeak.com" },
                { role: "Marketer", email: "marketer@kidspeak.com" },
                { role: "Photographer", email: "youcef@kidspeak.com" },
              ].map(({ role, email }) => (
                <div key={email} className="flex justify-between">
                  <span className="text-muted-foreground">{role}</span>
                  <button
                    type="button"
                    className="font-medium hover:underline cursor-pointer text-start"
                    onClick={() => {
                      form.setValue("email", email);
                      form.setValue("password", "admin123");
                    }}
                  >
                    {email}
                  </button>
                </div>
              ))}
              <div className="flex justify-between pt-1 border-t">
                <span className="text-muted-foreground">Password</span>
                <span className="font-mono font-medium">admin123</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
