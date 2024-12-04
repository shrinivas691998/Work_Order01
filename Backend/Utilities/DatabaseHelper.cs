namespace Backend.Utilities;

public static class DatabaseHelper
{
    public static async Task RetryOperation(Func<Task> operation, int maxRetries = 3)
    {
        for (int i = 0; i < maxRetries; i++)
        {
            try
            {
                await operation();
                return;
            }
            catch (Exception ex) when (i < maxRetries - 1)
            {
                Console.WriteLine($"Attempt {i + 1} failed: {ex.Message}");
                await Task.Delay(2000 * (i + 1)); // Exponential backoff
            }
        }
    }
} 