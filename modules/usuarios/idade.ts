   // Data de hoje no fuso da Bahia, no formato AAAA-MM-DD
   export function hojeISO() {
     return new Date().toLocaleDateString("en-CA", { timeZone: "America/Bahia" });
   }

   // nascimento: "AAAA-MM-DD" ou Date (guardada à meia-noite UTC)
   export function calcularIdade(nascimento: string | Date, hoje: string = hojeISO()) {
     const n = (typeof nascimento === "string" ? nascimento : nascimento.toISOString()).slice(0, 10);
     const [ny, nm, nd] = n.split("-").map(Number);
     const [hy, hm, hd] = hoje.split("-").map(Number);
     let idade = hy - ny;
     if (hm < nm || (hm === nm && hd < nd)) idade--;
     return idade;
   }