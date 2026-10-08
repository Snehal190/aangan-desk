import { LoginForm } from "./login-form";

export const metadata = { title: "Sign in · Aangan Desk" };

export default async function Login({ searchParams }: PageProps<"/login">) {
  const raw = (await searchParams).next;
  return (
    <div className="pt-10 text-center">
      <div className="mx-auto grid size-16 place-items-center rounded-[1.25rem] bg-ink">
        <span className="size-3 rounded-full bg-coral" />
      </div>
      <h1 className="mt-8 text-5xl font-medium tracking-tight sm:text-6xl">
        Aangan <span className="font-hand text-6xl font-normal text-coral-deep sm:text-7xl">desk</span>
      </h1>
      <p className="mx-auto mt-4 max-w-[500px] text-lg text-muted">
        Call reports for the front desk and designers. Ask the studio for the team passcode.
      </p>
      <LoginForm next={typeof raw === "string" ? raw : "/"} />
    </div>
  );
}
