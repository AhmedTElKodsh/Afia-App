# Migration Guide - Deprecated Components

## Deprecated Components (Removed 2026-04-25)

### CupVisualization Component
**Status:** DELETED  
**Replacement:** `FillConfirmScreen/CupVisualization.tsx`  
**Migration Path:**

The old `CupVisualization` component has been replaced with a new implementation inside the `FillConfirmScreen` folder.

**Old Import:**
```typescript
import { CupVisualization } from './components/CupVisualization';
```

**New Import:**
```typescript
import { CupVisualization } from './components/FillConfirmScreen/CupVisualization';
```

**Breaking Changes:**
- Component moved to `FillConfirmScreen` subfolder
- CSS file also moved to same location
- No API changes - props remain the same

### FillConfirm Component
**Status:** DELETED  
**Replacement:** `FillConfirmScreen/FillConfirmScreen.tsx`  
**Migration Path:**

The `FillConfirm` component has been refactored and renamed to `FillConfirmScreen`.

**Old Import:**
```typescript
import { FillConfirm } from './components/FillConfirm';
```

**New Import:**
```typescript
import { FillConfirmScreen } from './components/FillConfirmScreen/FillConfirmScreen';
```

**Breaking Changes:**
- Component renamed from `FillConfirm` to `FillConfirmScreen`
- Moved to dedicated subfolder with related components
- Props interface may have changed - check new component signature

## Timeline
- **Deprecated:** 2026-04-24
- **Removed:** 2026-04-25
- **Grace Period:** None (breaking change)

## Support
If you encounter issues migrating, check the new component implementations in:
- `src/components/FillConfirmScreen/`
