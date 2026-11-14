import { Closing } from "@/components/home/closing";
import { Hero } from "@/components/home/hero";
import { Problem } from "@/components/home/problem";
import { Products } from "@/components/home/products";
import { Roadmap } from "@/components/home/roadmap";
import { System } from "@/components/home/system";

export default function Home() {
  return (
    <>
      <Hero />
      <Problem />
      <Products />
      <System />
      <Roadmap />
      <Closing />
    </>
  );
}
