import { Instagram, Linkedin, ArrowUpRight } from "lucide-react";
import { socials } from "@/content/site";
import s from "./siteChrome.module.css";

export function SocialLinks() {
  return (
    <nav aria-label="TechNeeds social media" className={s.socialLinks}>
      {socials.map(({ name, handle, href }) => {
        const Icon = name === "Instagram" ? Instagram : Linkedin;
        return (
          <a key={name} href={href} target="_blank" rel="noopener noreferrer" aria-label={`TechNeeds on ${name} (opens in a new tab)`}>
            <Icon size={20} aria-hidden="true" />
            <span>{name}<small>{handle}</small></span>
            <ArrowUpRight size={16} aria-hidden="true" />
          </a>
        );
      })}
    </nav>
  );
}
