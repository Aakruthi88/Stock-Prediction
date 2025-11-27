
# Supabase Setup

To complete the integration, you need to configure your environment variables.

1.  Create a file named `.env.local` in the root directory of your project.
2.  Add the following lines to it, replacing the values with your actual Supabase project details:

```env
NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
```

## Testing the Connection

Once you have added the environment variables:

1.  Restart your development server:
    ```bash
    npm run dev
    ```
2.  Visit the test API route:
    [http://localhost:3000/api/test-supabase](http://localhost:3000/api/test-supabase)

You should see a JSON response indicating success or failure.
