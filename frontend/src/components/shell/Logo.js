import Image from "next/image";
import Link from "next/link";
import logo from "@/assets/logo.png";
import { cn } from "@/lib/cn";

// The TechNeeds globe-and-gear mark is black on transparent, so it sits on a
// light disc to stay legible on the dark ground.
export function Logo({ href = "/", compact = false, className }) {
  return (
    <Link href={href} className={cn("inline-flex items-center gap-2.5 group", className)} aria-label="TechNeeds home">
      <span className="size-9 rounded-full bg-[#f4f5f7] grid place-items-center ring-1 ring-line shrink-0">
        <Image src={logo} alt="" width={30} height={30} priority />
      </span>
      {!compact && (
        <span className="leading-none">
          <span className="tn-heading block text-[16px] text-paper">TechNeeds</span>
          <span className="block text-[12px] text-muted mt-0.5">IGDTUW</span>
        </span>
      )}
    </Link>
  );
}
