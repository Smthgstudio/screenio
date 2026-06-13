import Image from "next/image";

export default function Logo({ className = "", height = 28 }: { className?: string; height?: number }) {
  return (
    <Image
      src="/logo.svg"
      alt="Screenio"
      height={height}
      width={height * 5.5}
      className={className}
      priority
    />
  );
}
