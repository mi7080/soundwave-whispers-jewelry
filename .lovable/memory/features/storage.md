---
name: Supabase Storage asset architecture
description: Audio, photo, and SVG assets stored in Supabase Storage buckets instead of Cloudinary
type: feature
---
- Buckets: `soul_assets` (customer photo + audio), `production_assets` (engraving SVG)
- Path pattern: `[UUID]/filename.ext`
- Photos uploaded via PetPhotoUpload → soul_assets
- Audio uploaded via AudioRecorder → soul_assets
- SVG uploaded via upload-production-assets edge function → production_assets
- SoulPage fetches URLs directly from animus_orders table columns (pet_photo_url, audio_url)
- No Cloudinary dependency remaining
