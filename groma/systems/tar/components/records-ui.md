---
type: C4 Component
title: Record browsing
status: stable
groma:
  id: records-ui
  parent: tar
  code:
    - scanner: react
      file: tarapp/src/components/RecordDetailModal.tsx
    - scanner: typescript
      file: tarapp/src/components/RecordDetailModal.tsx
      symbol: RecordDetailModal
    - scanner: react
      file: tarapp/src/components/SearchRecordsModal.tsx
    - scanner: typescript
      file: tarapp/src/components/SearchRecordsModal.tsx
      symbol: SearchRecordsModal
description: Opens a record's detail and search.
---

Shows a record's fields, timeline and related work, with search across permitted records.
