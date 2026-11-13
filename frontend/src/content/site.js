// Public-site copy, carried over from the upstream TechNeeds pages
// (components/Home, FAQnTest, footer) so the redesign keeps their content.
// Team and testimonials live in team.json / testimonials.json, extracted
// from the upstream markup by script.
import web from "@/assets/WEB.jpeg";
import c from "@/assets/C.png";
import ml from "@/assets/ML.png";
import java from "@/assets/JAVA.jpeg";
import ar from "@/assets/ar.png";
import app from "@/assets/app.jpg";
import glimpse from "@/assets/Glimpse.png";

export const intro =
  "At TechNeeds, we're passionate about technology and committed to empowering individuals with knowledge. Our community serves as a vibrant hub for tech enthusiasts, from beginners to experts, offering a comprehensive destination for all things tech.";

// The community's own figures from the upstream site (all-time, not live data).
export const history = [
  { value: "1200+", label: "Trained mentees" },
  { value: "50+", label: "Professional mentors" },
  { value: "10+", label: "Mentorship cohorts" },
  { value: "100+", label: "Events" },
];

export const mission =
  "To be the go-to resource for anyone seeking to understand, explore, and stay updated on the ever-evolving world of technology.";

export const offers = ["In-depth insights", "Educational content", "Community engagement", "Hackathons", "Speaker sessions"];

export const cohorts = [
  { title: "Web Development", lead: "Vidushi Agarwal", image: web },
  { title: "DSA in C/C++", lead: "Shefali Kaushal", image: c },
  { title: "Machine Learning", lead: "Sripriya Aggarwal", image: ml },
  { title: "DSA in Java", lead: "Tavleen Kaur", image: java },
  { title: "AR/VR Mentorship", lead: "Snighdha", image: ar },
  { title: "App Development", lead: "Muskan Manvi", image: app },
];

export const glimpseImage = glimpse;

export const faqs = [
  { q: "What is TechNeeds?", a: "TechNeeds is the technical community at IGDTUW, built around peer-to-peer learning, mentorship and skill development: all you need to know about tech." },
  { q: "How can I contact support?", a: "You can contact support via our official WhatsApp group or email us at techneedsigdtuw@gmail.com." },
  { q: "What services do you offer?", a: "We offer a range of services including hackathons, tech introductory sessions, mentorship programs, tech engagement competitions and speaker sessions." },
  { q: "Where is TechNeeds located?", a: "TechNeeds is based in the heart of IGDTUW, founded in 2023." },
  { q: "Can I track my mentorship journey?", a: "Yes. Sign in to see what's due, take quizzes, submit projects, follow your rank on the leaderboard and read your AI profile." },
  { q: "How are points and ranks worked out?", a: "Videos earn their points minus one per day late, quizzes are graded on the server and scaled to their max score, and projects earn the score your mentor gives. Ties go to whoever reached the score first. The leaderboard page explains it in full." },
];

export const contact = {
  email: "techneedsigdtuw@gmail.com",
  whatsapp: { label: "+91 89588 98580", url: "https://wa.me/918958898580" },
};
