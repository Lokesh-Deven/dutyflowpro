import React from 'react';

// Illustration 1: Clipboard, Stopwatch, Pencil & Checklist (Slide 1)
export function ClipboardIllustration({ className = "w-full max-w-[440px] h-auto" }: { className?: string }) {
  return (
    <svg viewBox="0 0 500 400" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
      {/* Background Soft Glow */}
      <circle cx="200" cy="220" r="150" fill="#EEF2FF" />
      <circle cx="360" cy="180" r="90" fill="#ECFEFF" />

      {/* ID Card in background */}
      <g opacity="0.6">
        <rect x="50" y="60" width="100" height="130" rx="8" fill="white" stroke="#CBD5E1" strokeWidth="2" />
        <circle cx="100" cy="100" r="22" fill="#E2E8F0" />
        <path d="M80 135 C80 120, 120 120, 120 135" fill="#94A3B8" />
        <rect x="65" y="148" width="70" height="6" rx="3" fill="#CBD5E1" />
        <rect x="75" y="160" width="50" height="5" rx="2.5" fill="#E2E8F0" />
      </g>

      {/* Lightbulb */}
      <g transform="translate(45, 170)">
        <ellipse cx="28" cy="28" rx="20" ry="22" fill="#F59E0B" fillOpacity="0.85" />
        <path d="M20 45 H36 V52 H20 Z" fill="#475569" />
        <path d="M22 30 L28 20 L34 30" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M24 10 L28 4 L32 10" stroke="#F59E0B" strokeWidth="2" strokeLinecap="round" />
        <path d="M8 24 L2 24" stroke="#F59E0B" strokeWidth="2" strokeLinecap="round" />
        <path d="M48 24 L54 24" stroke="#F59E0B" strokeWidth="2" strokeLinecap="round" />
      </g>

      {/* Main Clipboard Body */}
      <g filter="drop-shadow(0px 10px 20px rgba(79, 70, 229, 0.12))">
        {/* Board base */}
        <rect x="110" y="90" width="200" height="260" rx="14" fill="#1E293B" />
        <rect x="115" y="95" width="190" height="250" rx="10" fill="#4F46E5" />
        {/* Paper Sheet */}
        <rect x="125" y="110" width="170" height="225" rx="8" fill="white" />
        
        {/* Clip Top */}
        <rect x="175" y="75" width="70" height="28" rx="6" fill="#312E81" />
        <circle cx="210" cy="88" r="6" fill="white" />
        <rect x="185" y="92" width="50" height="12" rx="3" fill="#6366F1" />

        {/* Checkbox Rows */}
        {/* Row 1 */}
        <rect x="140" y="135" width="24" height="24" rx="5" fill="#4F46E5" />
        <path d="M146 147 L150 151 L158 141" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
        <rect x="172" y="142" width="105" height="10" rx="4" fill="#E0E7FF" />

        {/* Row 2 */}
        <rect x="140" y="175" width="24" height="24" rx="5" fill="#4F46E5" />
        <path d="M146 187 L150 191 L158 181" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
        <rect x="172" y="182" width="90" height="10" rx="4" fill="#EEF2FF" />
        <rect x="172" y="196" width="60" height="6" rx="3" fill="#E2E8F0" />

        {/* Row 3 */}
        <rect x="140" y="220" width="24" height="24" rx="5" fill="#4F46E5" />
        <path d="M146 232 L150 236 L158 226" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
        <rect x="172" y="227" width="95" height="10" rx="4" fill="#E0E7FF" />

        {/* Row 4 */}
        <rect x="140" y="265" width="24" height="24" rx="5" fill="#E0E7FF" stroke="#4F46E5" strokeWidth="2" />
        <path d="M146 277 L150 281 L158 271" stroke="#4F46E5" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
        <rect x="172" y="272" width="75" height="10" rx="4" fill="#F1F5F9" />
      </g>

      {/* Stopwatch on bottom left */}
      <g transform="translate(60, 230)">
        <circle cx="45" cy="55" r="38" fill="#1E1B4B" />
        <circle cx="45" cy="55" r="32" fill="white" />
        <circle cx="45" cy="55" r="4" fill="#4F46E5" />
        <line x1="45" y1="55" x2="45" y2="35" stroke="#4F46E5" strokeWidth="3" strokeLinecap="round" />
        <line x1="45" y1="55" x2="62" y2="55" stroke="#0891B2" strokeWidth="2.5" strokeLinecap="round" />
        {/* Top button */}
        <rect x="40" y="10" width="10" height="8" rx="2" fill="#1E1B4B" />
        <rect x="36" y="8" width="18" height="4" rx="2" fill="#4F46E5" />
      </g>

      {/* Person Character writing with giant pencil */}
      <g transform="translate(260, 130)">
        {/* Shadow */}
        <ellipse cx="60" cy="205" rx="65" ry="8" fill="#CBD5E1" fillOpacity="0.4" />

        {/* Giant Pencil */}
        <g transform="rotate(-35 30 50)">
          <rect x="-80" y="40" width="180" height="24" rx="4" fill="#60A5FA" stroke="#1D4ED8" strokeWidth="2" />
          <rect x="100" y="40" width="30" height="24" fill="#CBD5E1" />
          <path d="M130 40 L160 52 L130 64 Z" fill="#FDE68A" />
          <path d="M150 48 L160 52 L150 56 Z" fill="#1E293B" />
          <rect x="-105" y="40" width="25" height="24" rx="4" fill="#F43F5E" />
        </g>

        {/* Character Body */}
        {/* Head & Hair */}
        <circle cx="45" cy="40" r="16" fill="#FCD34D" />
        <path d="M30 35 C28 20, 60 18, 62 35 C65 42, 58 55, 45 55 C35 55, 28 45, 30 35" fill="#1E293B" />
        <circle cx="46" cy="42" r="12" fill="#FED7AA" />

        {/* Torso & Shirt */}
        <path d="M32 54 L62 54 L72 105 L26 105 Z" fill="#3B82F6" />
        <path d="M42 54 L52 54 L56 75 L38 75 Z" fill="white" />

        {/* Arms holding pencil */}
        <path d="M34 62 L-10 82 L-5 95 L34 76 Z" fill="#2563EB" />
        <circle cx="-10" cy="88" r="7" fill="#FED7AA" />
        <path d="M55 62 L8 95 L14 106 L62 76 Z" fill="#1D4ED8" />
        <circle cx="10" cy="100" r="7" fill="#FED7AA" />

        {/* Legs & Pants */}
        <path d="M32 105 L20 180 L35 180 L46 115 Z" fill="#1E3A8A" />
        <path d="M48 105 L65 170 L78 168 L60 105 Z" fill="#172554" />

        {/* Shoes */}
        <ellipse cx="22" cy="184" rx="14" ry="6" fill="#0284C7" />
        <ellipse cx="72" cy="174" rx="14" ry="6" fill="#0284C7" />
      </g>
    </svg>
  );
}

// Illustration 2: Team Collaboration with AI Robot & Gears (Slide 2)
export function TeamAiIllustration({ className = "w-full max-w-[440px] h-auto" }: { className?: string }) {
  return (
    <svg viewBox="0 0 500 400" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
      {/* Background Soft Blob */}
      <path d="M120 100 C60 160, 40 280, 100 340 C180 400, 360 380, 430 310 C490 250, 470 120, 390 70 C310 20, 200 40, 120 100 Z" fill="#EEF2FF" />

      {/* Floating Smart Gears */}
      {/* Gear 1 (Indigo) */}
      <g transform="translate(180, 80)">
        <circle cx="25" cy="25" r="16" fill="none" stroke="#4F46E5" strokeWidth="6" strokeDasharray="6 3" />
        <circle cx="25" cy="25" r="7" fill="#4F46E5" />
      </g>
      {/* Gear 2 (Cyan) */}
      <g transform="translate(235, 110)">
        <circle cx="20" cy="20" r="13" fill="none" stroke="#0891B2" strokeWidth="5" strokeDasharray="5 3" />
        <circle cx="20" cy="20" r="5" fill="#0891B2" />
      </g>
      {/* Gear 3 (Amber) */}
      <g transform="translate(195, 160)">
        <circle cx="15" cy="15" r="10" fill="none" stroke="#F59E0B" strokeWidth="4" strokeDasharray="4 2" />
        <circle cx="15" cy="15" r="4" fill="#F59E0B" />
      </g>

      {/* AI Robot Assistant (Floating) */}
      <g transform="translate(140, 90)">
        {/* Antenna */}
        <line x1="35" y1="5" x2="35" y2="15" stroke="#1E293B" strokeWidth="3" strokeLinecap="round" />
        <circle cx="35" cy="4" r="4" fill="#0891B2" />
        {/* Head */}
        <rect x="15" y="15" width="40" height="30" rx="15" fill="white" stroke="#1E293B" strokeWidth="3" />
        {/* Screen/Face */}
        <rect x="22" y="22" width="26" height="16" rx="8" fill="#1E293B" />
        {/* Glowing Eyes */}
        <circle cx="29" cy="30" r="3" fill="#38BDF8" />
        <circle cx="41" cy="30" r="3" fill="#38BDF8" />
        {/* Robot Body */}
        <rect x="20" y="48" width="30" height="22" rx="10" fill="white" stroke="#1E293B" strokeWidth="3" />
        <circle cx="35" cy="58" r="4" fill="#4F46E5" />
      </g>

      {/* Conference Table */}
      <rect x="80" y="225" width="280" height="20" rx="4" fill="white" stroke="#1E293B" strokeWidth="2.5" />
      <line x1="110" y1="245" x2="110" y2="310" stroke="#1E293B" strokeWidth="3" strokeLinecap="round" />
      <line x1="330" y1="245" x2="330" y2="310" stroke="#1E293B" strokeWidth="3" strokeLinecap="round" />
      <line x1="80" y1="310" x2="140" y2="310" stroke="#1E293B" strokeWidth="3" strokeLinecap="round" />
      <line x1="300" y1="310" x2="360" y2="310" stroke="#1E293B" strokeWidth="3" strokeLinecap="round" />

      {/* Laptops on Table */}
      {/* Laptop 1 (Left) */}
      <path d="M125 225 L145 195 L175 195 L165 225 Z" fill="#3B82F6" stroke="#1E293B" strokeWidth="2" />
      <rect x="120" y="223" width="55" height="4" rx="1" fill="#1E293B" />
      {/* Laptop 2 (Right) */}
      <path d="M245 225 L255 195 L285 195 L275 225 Z" fill="white" stroke="#1E293B" strokeWidth="2" />
      <circle cx="270" cy="210" r="4" fill="#4F46E5" />

      {/* Person 1: Woman on Left */}
      <g transform="translate(60, 140)">
        {/* Hair */}
        <path d="M25 20 C10 15, 5 45, 20 60 C30 70, 50 65, 45 40 Z" fill="#1E293B" />
        <circle cx="35" cy="30" r="12" fill="#FED7AA" />
        {/* Body & Shirt */}
        <path d="M20 50 L50 50 L58 100 L12 100 Z" fill="#1E293B" />
        {/* Legs / Skirt */}
        <path d="M15 100 L45 100 L55 180 L25 180 Z" fill="#3B82F6" />
        {/* Shoes */}
        <ellipse cx="24" cy="185" rx="8" ry="12" fill="#1E293B" />
      </g>

      {/* Person 2: Man in Center / Speaking */}
      <g transform="translate(190, 135)">
        {/* Hair & Head */}
        <path d="M50 15 C45 5, 65 5, 68 15 C72 25, 65 35, 55 35 Z" fill="#1E293B" />
        <circle cx="58" cy="25" r="11" fill="#FED7AA" />
        {/* Beard */}
        <path d="M50 25 C50 38, 65 38, 65 25" fill="#1E293B" />
        {/* Blue Shirt */}
        <path d="M40 45 L80 45 L90 100 L30 100 Z" fill="#2563EB" />
        {/* Gesturing Hand */}
        <path d="M40 50 L10 75 L22 82 L48 58 Z" fill="#2563EB" />
        <circle cx="10" cy="76" r="5" fill="#FED7AA" />
        {/* Legs */}
        <path d="M35 100 L60 100 L75 185 L50 185 Z" fill="#1E293B" />
        <ellipse cx="70" cy="188" rx="12" ry="6" fill="#2563EB" />
      </g>

      {/* Person 3: Person on Right sitting on Chair */}
      <g transform="translate(290, 145)">
        {/* Blue Modern Chair */}
        <path d="M30 40 C30 25, 65 25, 65 40 L65 95 C65 110, 15 110, 15 95 Z" fill="#60A5FA" />
        <line x1="40" y1="110" x2="40" y2="180" stroke="#1E293B" strokeWidth="3" />
        <ellipse cx="40" cy="180" rx="25" ry="5" fill="#CBD5E1" />

        {/* Head */}
        <path d="M40 15 C35 5, 55 5, 58 15 Z" fill="#1E293B" />
        <circle cx="48" cy="24" r="10" fill="#FED7AA" />
        {/* White Shirt */}
        <path d="M35 42 L65 42 L70 90 L25 90 Z" fill="white" stroke="#1E293B" strokeWidth="1.5" />
        {/* Blue Pants */}
        <path d="M25 90 L60 90 L50 160 L15 160 Z" fill="#2563EB" />
        {/* Shoe */}
        <ellipse cx="42" cy="165" rx="12" ry="6" fill="#1E293B" />
      </g>
    </svg>
  );
}

// Illustration 3: Modern Educational Campus & Graduation (Slide 3)
export function CampusIllustration({ className = "w-full max-w-[440px] h-auto" }: { className?: string }) {
  return (
    <svg viewBox="0 0 500 400" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
      {/* Background Soft Sky & Tree Leaf */}
      <circle cx="360" cy="160" r="110" fill="#DBEAFE" />
      <path d="M380 60 C440 80, 480 180, 430 250 C380 230, 360 140, 380 60 Z" fill="#93C5FD" fillOpacity="0.7" />

      {/* Neoclassical University Campus Building */}
      <g transform="translate(100, 120)">
        {/* Roof Triangular Pediment */}
        <path d="M-10 50 L140 -5 L290 50 Z" fill="#EA580C" />
        <circle cx="140" cy="26" r="10" fill="#FED7AA" />

        {/* Main Building Base Block */}
        <rect x="0" y="50" width="280" height="135" rx="4" fill="#F87171" />

        {/* Windows Grid (White Academic Panes) */}
        {/* Left Windows */}
        <rect x="18" y="65" width="18" height="26" rx="2" fill="white" stroke="#DC2626" strokeWidth="1.5" />
        <rect x="44" y="65" width="18" height="26" rx="2" fill="white" stroke="#DC2626" strokeWidth="1.5" />
        <rect x="18" y="105" width="18" height="26" rx="2" fill="white" stroke="#DC2626" strokeWidth="1.5" />
        <rect x="44" y="105" width="18" height="26" rx="2" fill="white" stroke="#DC2626" strokeWidth="1.5" />

        {/* Center Pillars & Arched Grand Entrance */}
        <rect x="80" y="50" width="120" height="135" fill="#FCA5A5" />
        <line x1="95" y1="50" x2="95" y2="185" stroke="white" strokeWidth="4" />
        <line x1="125" y1="50" x2="125" y2="185" stroke="white" strokeWidth="4" />
        <line x1="155" y1="50" x2="155" y2="185" stroke="white" strokeWidth="4" />
        <line x1="185" y1="50" x2="185" y2="185" stroke="white" strokeWidth="4" />

        {/* Arched Windows in Center */}
        <path d="M102 75 C102 65, 118 65, 118 75 L118 95 L102 95 Z" fill="white" stroke="#DC2626" strokeWidth="1.5" />
        <path d="M132 75 C132 65, 148 65, 148 75 L148 95 L132 95 Z" fill="white" stroke="#DC2626" strokeWidth="1.5" />
        <path d="M162 75 C162 65, 178 65, 178 75 L178 95 L162 95 Z" fill="white" stroke="#DC2626" strokeWidth="1.5" />

        {/* Grand Arch Doorway */}
        <path d="M120 185 L120 135 C120 120, 160 120, 160 135 L160 185 Z" fill="#F87171" stroke="white" strokeWidth="3" />

        {/* Right Windows */}
        <rect x="218" y="65" width="18" height="26" rx="2" fill="white" stroke="#DC2626" strokeWidth="1.5" />
        <rect x="244" y="65" width="18" height="26" rx="2" fill="white" stroke="#DC2626" strokeWidth="1.5" />
        <rect x="218" y="105" width="18" height="26" rx="2" fill="white" stroke="#DC2626" strokeWidth="1.5" />
        <rect x="244" y="105" width="18" height="26" rx="2" fill="white" stroke="#DC2626" strokeWidth="1.5" />

        {/* Foundation Plinth */}
        <rect x="-8" y="180" width="296" height="12" fill="#EA580C" />
      </g>

      {/* Flying Graduation Cap (Mortarboard) */}
      <g transform="translate(100, 110)">
        <polygon points="45,5 90,20 45,35 0,20" fill="#2563EB" />
        <rect x="28" y="27" width="34" height="12" rx="4" fill="#1D4ED8" />
        {/* Tassel */}
        <circle cx="45" cy="20" r="3" fill="#1E1B4B" />
        <path d="M45 20 C55 25, 65 30, 68 45" stroke="#1E1B4B" strokeWidth="2.5" fill="none" />
        <rect x="65" y="44" width="6" height="10" rx="1" fill="#1E1B4B" />
      </g>

      {/* Giant Blue Books Stack with Woman Sitting */}
      <g transform="translate(280, 240)">
        {/* Book 1 (Bottom) */}
        <rect x="0" y="30" width="150" height="30" rx="4" fill="#1D4ED8" />
        <rect x="6" y="34" width="138" height="22" fill="#BFDBFE" />
        <line x1="12" y1="42" x2="135" y2="42" stroke="#60A5FA" strokeWidth="2" />
        <line x1="12" y1="48" x2="135" y2="48" stroke="#60A5FA" strokeWidth="2" />

        {/* Book 2 (Top) */}
        <rect x="15" y="0" width="125" height="30" rx="4" fill="#2563EB" />
        <rect x="100" y="4" width="16" height="22" fill="#93C5FD" />

        {/* Woman sitting with laptop on Books */}
        <g transform="translate(30, -95)">
          {/* Hair & Head */}
          <path d="M30 10 C15 5, 10 40, 45 45 C55 45, 60 25, 45 10 Z" fill="#1E293B" />
          <circle cx="36" cy="22" r="10" fill="#FED7AA" />
          {/* Shirt */}
          <path d="M25 40 L50 40 L58 75 L20 75 Z" fill="#3B82F6" />
          {/* Laptop */}
          <path d="M10 75 L30 55 L38 55 L28 75 Z" fill="#1E293B" />
          <circle cx="34" cy="65" r="2" fill="white" />
          {/* Pants */}
          <path d="M22 75 L52 75 L62 135 L42 135 Z" fill="#1E1B4B" />
          {/* Shoes */}
          <ellipse cx="45" cy="138" rx="8" ry="4" fill="#1E293B" />
        </g>
      </g>

      {/* Faculty Scholar Standing on Left */}
      <g transform="translate(190, 200)">
        {/* Head */}
        <circle cx="30" cy="25" r="10" fill="#9A3412" />
        <path d="M20 20 C20 10, 40 10, 40 20 Z" fill="#1E293B" />
        {/* Blue Shirt */}
        <path d="M18 42 L42 42 L48 90 L12 90 Z" fill="#2563EB" />
        {/* Holding Clipboard */}
        <rect x="35" y="55" width="22" height="30" rx="2" fill="#1E293B" />
        <rect x="37" y="57" width="18" height="26" rx="1" fill="white" />
        {/* Dark Blue Pants */}
        <path d="M15 90 L40 90 L45 155 L30 155 L26 105 L15 155 L0 155 Z" fill="#1E1B4B" />
        {/* Shoes */}
        <ellipse cx="38" cy="158" rx="10" ry="4" fill="#1E293B" />
        <ellipse cx="6" cy="158" rx="10" ry="4" fill="#1E293B" />
      </g>
    </svg>
  );
}

// Illustration 4: Smart Idea Bulb, Gears & Analytics (Slide 4)
export function IdeaWorkflowIllustration({ className = "w-full max-w-[440px] h-auto" }: { className?: string }) {
  return (
    <svg viewBox="0 0 500 400" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
      {/* Background Glow */}
      <circle cx="280" cy="200" r="130" fill="#FEF3C7" fillOpacity="0.6" />

      {/* Floating Gear 1 (Indigo) */}
      <g transform="translate(300, 75)">
        <circle cx="25" cy="25" r="18" fill="none" stroke="#4F46E5" strokeWidth="8" strokeDasharray="8 4" />
        <circle cx="25" cy="25" r="8" fill="#4F46E5" />
      </g>
      {/* Floating Gear 2 (Rose) */}
      <g transform="translate(315, 175)">
        <circle cx="16" cy="16" r="12" fill="none" stroke="#F43F5E" strokeWidth="5" strokeDasharray="5 3" />
        <circle cx="16" cy="16" r="5" fill="#F43F5E" />
      </g>
      {/* Floating Gear 3 (Cyan) */}
      <g transform="translate(230, 175)">
        <circle cx="12" cy="12" r="9" fill="none" stroke="#0891B2" strokeWidth="4" strokeDasharray="4 2" />
        <circle cx="12" cy="12" r="4" fill="#0891B2" />
      </g>

      {/* Big Central Lightbulb */}
      <g transform="translate(180, 110)">
        {/* Glass Dome */}
        <ellipse cx="60" cy="70" rx="55" ry="60" fill="#FBBF24" />
        {/* Filament */}
        <path d="M45 70 C45 45, 75 45, 75 70" stroke="white" strokeWidth="5" strokeLinecap="round" fill="none" />
        <path d="M50 70 L50 95" stroke="white" strokeWidth="4" strokeLinecap="round" />
        <path d="M70 70 L70 95" stroke="white" strokeWidth="4" strokeLinecap="round" />
        
        {/* Base */}
        <path d="M40 120 H80 V135 H40 Z" fill="#334155" />
        <path d="M44 135 H76 V145 H44 Z" fill="#1E293B" />
        <path d="M48 145 H72 V152 H48 Z" fill="#0F172A" />
      </g>

      {/* Analytics Growth Bar Chart */}
      <g transform="translate(240, 235)">
        <rect x="0" y="45" width="12" height="30" rx="3" fill="#A7F3D0" />
        <rect x="16" y="25" width="12" height="50" rx="3" fill="#F43F5E" />
        <rect x="32" y="10" width="12" height="65" rx="3" fill="#FBBF24" />
        <rect x="48" y="-15" width="12" height="90" rx="3" fill="#3B82F6" />
      </g>

      {/* Note / Document Card */}
      <g transform="translate(195, 235)">
        <rect x="0" y="0" width="30" height="30" rx="4" fill="#FEF08A" stroke="#E2E8F0" strokeWidth="1" />
        <line x1="6" y1="8" x2="24" y2="8" stroke="#CA8A04" strokeWidth="2" />
        <line x1="6" y1="14" x2="20" y2="14" stroke="#CA8A04" strokeWidth="2" />
      </g>

      {/* Woman Character presenting the solution */}
      <g transform="translate(325, 95)">
        {/* Hair */}
        <path d="M35 15 C20 5, 10 30, 25 40 C35 50, 60 45, 55 20 Z" fill="#1E293B" />
        <circle cx="40" cy="24" r="11" fill="#9A3412" />

        {/* Orange Top */}
        <path d="M22 45 L58 45 L68 95 L14 95 Z" fill="#F97316" />

        {/* Arms outstretched */}
        <path d="M24 48 L-15 28 L-8 18 L32 38 Z" fill="#EA580C" />
        <circle cx="-16" cy="24" r="6" fill="#9A3412" />
        <path d="M54 48 L90 28 L98 38 L58 58 Z" fill="#EA580C" />
        <circle cx="95" cy="28" r="6" fill="#9A3412" />

        {/* Blue Pants */}
        <path d="M18 95 L64 95 L56 220 L40 220 L40 135 L34 220 L18 220 Z" fill="#3B82F6" />

        {/* Shoes */}
        <ellipse cx="25" cy="225" rx="10" ry="5" fill="#C2410C" />
        <ellipse cx="48" cy="225" rx="10" ry="5" fill="#C2410C" />
      </g>
    </svg>
  );
}

// Illustration 5: Digital Cloud Transformation & Automation (Slide 5)
export function CloudTransformationIllustration({ className = "w-full max-w-[440px] h-auto" }: { className?: string }) {
  return (
    <svg viewBox="0 0 500 400" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
      {/* Background Decorative Tropical Leaves */}
      <path d="M70 160 C30 180, 10 260, 50 320 C90 280, 100 210, 70 160 Z" fill="#BE185D" fillOpacity="0.75" />
      <path d="M400 120 C460 160, 480 260, 420 320 C380 270, 370 180, 400 120 Z" fill="#BE185D" fillOpacity="0.75" />
      <circle cx="250" cy="220" r="140" fill="#FCE7F3" fillOpacity="0.5" />

      {/* Main Big Blue Digital Cloud */}
      <g filter="drop-shadow(0px 10px 25px rgba(56, 189, 248, 0.25))">
        <path d="M120 280 C90 280, 70 250, 75 220 C80 180, 120 160, 150 165 C170 120, 240 100, 280 130 C320 110, 370 130, 380 170 C410 175, 430 205, 425 240 C420 275, 390 280, 360 280 Z" fill="#38BDF8" />
        <path d="M130 280 C105 280, 90 255, 95 230 C100 195, 135 178, 160 182 C178 142, 238 125, 272 152 C308 135, 350 152, 360 188 C388 192, 405 218, 400 248 C396 278, 370 280, 345 280 Z" fill="#0284C7" fillOpacity="0.3" />
      </g>

      {/* Cloud Icons Grid */}
      {/* Globe Icon */}
      <g transform="translate(205, 195)">
        <circle cx="20" cy="20" r="18" fill="none" stroke="white" strokeWidth="2" />
        <ellipse cx="20" cy="20" rx="8" ry="18" fill="none" stroke="white" strokeWidth="2" />
        <line x1="2" y1="20" x2="38" y2="20" stroke="white" strokeWidth="2" />
      </g>
      {/* File & Lock Icon */}
      <g transform="translate(160, 185)">
        <rect x="0" y="0" width="18" height="22" rx="3" fill="none" stroke="white" strokeWidth="2" />
        <circle cx="9" cy="11" r="3" fill="white" />
      </g>
      {/* Image Gallery Icon */}
      <g transform="translate(155, 235)">
        <rect x="0" y="0" width="22" height="18" rx="3" fill="none" stroke="white" strokeWidth="2" />
        <polygon points="4,14 10,8 14,12 18,6 18,14" fill="white" />
      </g>
      {/* Email Icon */}
      <g transform="translate(280, 225)">
        <rect x="0" y="0" width="24" height="16" rx="3" fill="none" stroke="white" strokeWidth="2" />
        <polyline points="2,2 12,10 22,2" stroke="white" strokeWidth="2" fill="none" />
      </g>
      {/* Sync Arrows */}
      <g transform="translate(335, 135)">
        <path d="M10 0 L15 5 L10 10 M15 5 L0 5" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M5 20 L0 15 L5 10 M0 15 L15 15" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
      </g>

      {/* Big Dark Blue Gear inside Cloud */}
      <g transform="translate(315, 175)">
        <circle cx="28" cy="28" r="22" fill="none" stroke="#0F172A" strokeWidth="8" strokeDasharray="8 4" />
        <circle cx="28" cy="28" r="9" fill="#0F172A" />
      </g>

      {/* Ladder on Left */}
      <g transform="translate(100, 220)">
        <line x1="5" y1="0" x2="-15" y2="85" stroke="#38BDF8" strokeWidth="3" />
        <line x1="25" y1="0" x2="5" y2="85" stroke="#38BDF8" strokeWidth="3" />
        <line x1="2" y1="18" x2="22" y2="18" stroke="#38BDF8" strokeWidth="2.5" />
        <line x1="-2" y1="36" x2="18" y2="36" stroke="#38BDF8" strokeWidth="2.5" />
        <line x1="-6" y1="54" x2="14" y2="54" stroke="#38BDF8" strokeWidth="2.5" />
        <line x1="-10" y1="72" x2="10" y2="72" stroke="#38BDF8" strokeWidth="2.5" />
      </g>

      {/* Person 1 on Ladder holding Magnifying Glass */}
      <g transform="translate(100, 140)">
        {/* Head */}
        <circle cx="35" cy="20" r="9" fill="#FED7AA" />
        <path d="M26 15 C26 5, 44 5, 44 15 Z" fill="#1E293B" />
        {/* Yellow Shirt */}
        <path d="M22 36 L48 36 L52 70 L18 70 Z" fill="#FACC15" />
        {/* Blue Pants */}
        <path d="M18 70 L50 70 L40 120 L15 120 Z" fill="#1E40AF" />
        {/* Giant Magnifying Glass with Checkmark */}
        <circle cx="68" cy="38" r="20" fill="white" stroke="#1E293B" strokeWidth="3" />
        <path d="M60 38 L66 44 L76 32" stroke="#10B981" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" />
        <line x1="55" y1="52" x2="42" y2="65" stroke="#1E293B" strokeWidth="4" strokeLinecap="round" />
      </g>

      {/* Person 2 on Right interacting with Digital App */}
      <g transform="translate(315, 225)">
        {/* Head */}
        <circle cx="28" cy="18" r="8" fill="#FED7AA" />
        <path d="M20 12 C20 2, 38 2, 36 25 Z" fill="#1E293B" />
        {/* Pink Top */}
        <path d="M20 32 L36 32 L40 55 L16 55 Z" fill="#F43F5E" />
        {/* Reaching arm */}
        <path d="M20 34 L-5 15 L-2 8 L24 28 Z" fill="#F43F5E" />
        <circle cx="-5" cy="12" r="4" fill="#FED7AA" />
        {/* Purple Skirt & Legs */}
        <path d="M16 55 L38 55 L42 90 L14 90 Z" fill="#7E22CE" />
        <line x1="22" y1="90" x2="22" y2="120" stroke="#FED7AA" strokeWidth="3" />
        <line x1="32" y1="90" x2="32" y2="120" stroke="#FED7AA" strokeWidth="3" />
        <ellipse cx="22" cy="122" rx="4" ry="2" fill="#BE185D" />
        <ellipse cx="32" cy="122" rx="4" ry="2" fill="#BE185D" />
      </g>
    </svg>
  );
}
