# ATLAS-OPTIMUS-LAYOUT-SHELL-AUDIT-127 — BLOCKER-ONLY REPORT

**Timestamp:** 2026-03-16 16:10 EDT  
**Objective:** Identify exact layout/container classes shrinking Atlas pages  
**Status:** ✅ AUDIT COMPLETE

---

## 🎯 WIDTH-LIMITING CLASSES IDENTIFIED

### 1. Knowledge Document View
**File:** `app/knowledge/document/[id]/page.tsx`

| Line | Current Class | Replacement Class | Purpose |
|------|---------------|-------------------|---------|
| 153 | `max-w-4xl mx-auto` | Remove `max-w-4xl`, keep `mx-auto` if centering desired | Empty state container |
| 165 | `max-w-5xl mx-auto` | Remove both | Main document content wrapper |

**Context:**
```tsx
// Line 153 - Empty state
<div className="max-w-4xl mx-auto text-center py-12">

// Line 165 - Main content
<div className="max-w-5xl mx-auto">
```

---

### 2. Health Processes Page
**File:** `app/health/processes/page.tsx`

| Line | Current Class | Replacement Class | Purpose |
|------|---------------|-------------------|---------|
| 82 | `container mx-auto` | `w-full` or remove `container` | Main page wrapper |

**Context:**
```tsx
// Line 82
<div className="container mx-auto py-6 space-y-6">
```

**Note:** Tailwind `container` class has max-width breakpoints:
- sm: 640px
- md: 768px  
- lg: 1024px
- xl: 1280px
- 2xl: 1536px

---

### 3. Executive Ops Decisions Page (Modal Only)
**File:** `app/executive-ops/decisions/page.tsx`

| Line | Current Class | Status |
|------|---------------|--------|
| 246 | `w-full max-w-lg` | ✅ KEEP - Modal dialog, should be constrained |

**Context:** Modal dialog width constraint is intentional.

---

### 4. Sales Pipeline Page (Modal Only)
**File:** `app/sales-marketing/pipeline/page.tsx`

| Line | Current Class | Status |
|------|---------------|--------|
| 291 | `w-full max-w-md` | ✅ KEEP - Modal/dialog content |

---

### 5. Task Create Modal (Component)
**File:** `app/components/task-create-modal.tsx`

| Line | Current Class | Status |
|------|---------------|--------|
| 114 | `w-full max-w-lg` | ✅ KEEP - Modal dialog |

---

## 📊 SUMMARY TABLE

| File | Line(s) | Class to Remove | Impact |
|------|---------|-----------------|--------|
| `app/knowledge/document/[id]/page.tsx` | 153, 165 | `max-w-4xl`, `max-w-5xl` | **HIGH** - Main content constrained |
| `app/health/processes/page.tsx` | 82 | `container` | **HIGH** - Page wrapper constrained |

---

## 🎨 REPLACEMENT LAYOUT CONTRACT

### Full-Width Shell Pattern (Recommended)

```tsx
// Standard full-width page wrapper
<div className="min-h-screen bg-[#0B0B0C]">
  <main className="p-4 sm:p-6">
    {/* Content goes here - no max-width constraints */}
  </main>
</div>
```

### For Realm Pages with Subnav

```tsx
// Layout already includes RealmSubnav
export default function RealmLayout({ children }) {
  return (
    <>
      <RealmSubnav items={navItems} realmName="Realm Name" />
      {children} {/* No wrapper div with max-width */}
    </>
  );
}

// Page component - direct content
export default function RealmPage() {
  return (
    <div className="p-4 sm:p-6"> {/* Standard padding from root layout */}
      {/* Full-width content */}
    </div>
  );
}
```

---

## 🔧 EXACT FIXES REQUIRED

### Fix 1: Knowledge Document View
**File:** `app/knowledge/document/[id]/page.tsx`

**Line 153:**
```diff
- <div className="max-w-4xl mx-auto text-center py-12">
+ <div className="text-center py-12">
```

**Line 165:**
```diff
- <div className="max-w-5xl mx-auto">
+ <div>
```

---

### Fix 2: Health Processes Page
**File:** `app/health/processes/page.tsx`

**Line 82:**
```diff
- <div className="container mx-auto py-6 space-y-6">
+ <div className="p-4 sm:p-6 py-6 space-y-6">
```

---

## ✅ VERIFIED CLEAN FILES

These realm pages already use full-width patterns:
- ✅ `app/control/page.tsx` - No max-width constraints
- ✅ `app/executive-ops/page.tsx` - No max-width constraints  
- ✅ `app/operations/page.tsx` - No max-width constraints
- ✅ `app/finance/page.tsx` - No max-width constraints

---

## 📋 EXIT CRITERIA MET

| Criterion | Status |
|-----------|--------|
| Identify max-w-* classes | ✅ COMPLETE |
| Identify container classes | ✅ COMPLETE |
| Map to specific files/lines | ✅ COMPLETE |
| Provide replacement contract | ✅ COMPLETE |
| Coordinate with Prime | 🔄 READY |

---

## 🚀 NEXT STEPS FOR PRIME

1. Apply the two exact fixes above
2. Verify no other `max-w-*` constraints exist:
   ```bash
   grep -rn "max-w-" app/ --include="*.tsx" | grep -v node_modules
   ```
3. Verify no `container` class usage:
   ```bash
   grep -rn "container" app/ --include="*.tsx" | grep -v node_modules
   ```

---

**Report File:** `ATLAS-OPTIMUS-LAYOUT-SHELL-AUDIT-127-REPORT.md`  
**Canonical Path:** `/root/.openclaw/workspaces/atlas-agentic-framework`
