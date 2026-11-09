   "use client";

   import { useRouter } from "next/navigation";
   import { authClient } from "@/lib/auth-client";
   import { Button } from "@/components/ui/button";

   export function BotaoSair() {
     const router = useRouter();
     return (
       <Button
         variant="outline"
         onClick={() =>
           authClient.signOut({ fetchOptions: { onSuccess: () => router.push("/login") } })
         }
       >
         Sair
       </Button>
     );
   }