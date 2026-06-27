# Supabase Storage Setup Guide (report-photos Bucket)

To store and retrieve citizen report photos, you need to create a Storage Bucket in your Supabase project dashboard and configure Row Level Security (RLS) policies.

Follow these simple steps:

## 1. Create the Bucket
1. Log into your [Supabase Dashboard](https://supabase.com/dashboard).
2. Click on **Storage** in the left sidebar navigation.
3. Click **New Bucket**.
4. Name the bucket exactly **`report-photos`**.
5. Toggle the **Public** switch to **Enabled** (this allows the app to fetch images via public URLs without signing URLs).
6. Click **Save**.

## 2. Configure Row Level Security (RLS) Policies
Under the **Storage** tab -> select `report-photos` -> click **Policies** -> add the following rules:

### Policy A: Allow Public Read/Select
- **Policy Name**: `Allow Public Read`
- **Allowed Operations**: `SELECT`
- **Target Roles**: `public`, `anon`, `authenticated`
- **Policy Definition**: `true` (always true, public read access)

### Policy B: Allow Public Insert/Upload
- **Policy Name**: `Allow Public Upload`
- **Allowed Operations**: `INSERT`
- **Target Roles**: `public`, `anon`, `authenticated`
- **Policy Definition**: `true` (always true, public anonymous upload access)

---

*Note: If you run the project locally before setting up the Storage bucket, the app contains an automatic fallback to base64 data URIs so that it remains fully functional and testable without crashing!*
