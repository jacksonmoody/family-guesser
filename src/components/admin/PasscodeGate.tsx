"use client";

import { useActionState } from "react";
import { verifyPasscode } from "@/app/actions/admin";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";

export function PasscodeGate() {
  const [state, formAction, pending] = useActionState(verifyPasscode, null);

  return (
    <Card className="flex flex-col gap-4">
      <div className="text-center">
        <h1 className="font-display text-2xl font-semibold">Admin Login</h1>
        <p className="mt-1 text-sm text-brown-700">
          Enter the admin passcode to manage the family tree.
        </p>
      </div>
      <form action={formAction} className="flex flex-col gap-3">
        <Input
          type="password"
          name="passcode"
          placeholder="Passcode"
          autoFocus
          required
        />
        {state?.error && (
          <p className="text-center text-sm text-terracotta-600">
            {state.error}
          </p>
        )}
        <Button type="submit" disabled={pending}>
          {pending ? "Verifying..." : "Enter Admin Dashboard"}
        </Button>
      </form>
    </Card>
  );
}
