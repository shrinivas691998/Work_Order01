using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Data.SqlClient;
using Microsoft.Extensions.Configuration;
using System.Data;
using System.IO;
using OfficeOpenXml;
using System.Text;
using System.Collections.Generic;
using Backend.Models;
using Backend.Utilities;

var builder = WebApplication.CreateBuilder(args);

// Add services to the container
builder.Services.AddControllers();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();
builder.Services.AddCors(options =>
{
    options.AddDefaultPolicy(policy =>
    {
        policy.AllowAnyOrigin()
              .AllowAnyHeader()
              .AllowAnyMethod();
    });
});

// Add SQL Server configuration
builder.Services.AddSingleton<IDbConnection>(sp =>
{
    var initialConnectionString = "Server=localhost,1433;Database=master;User Id=sa;Password=Order@12345;TrustServerCertificate=True;Connection Timeout=30;";
    var connection = new SqlConnection(initialConnectionString);
    
    // Initialize database with retry logic
    DatabaseHelper.RetryOperation(async () =>
    {
        try
        {
            Console.WriteLine("Attempting to connect to SQL Server...");
            await connection.OpenAsync();
            Console.WriteLine("Successfully connected to SQL Server.");
            
            // Create database if it doesn't exist
            var createDbQuery = @"
                IF NOT EXISTS (SELECT * FROM sys.databases WHERE name = 'workorderdb')
                BEGIN
                    CREATE DATABASE workorderdb;
                    PRINT 'Database created successfully.';
                END";

            using (var command = new SqlCommand(createDbQuery, connection))
            {
                await command.ExecuteNonQueryAsync();
                Console.WriteLine("Database creation step completed.");
            }

            // Switch to workorderdb for table creation
            connection.ChangeDatabase("workorderdb");
            Console.WriteLine("Switched to workorderdb.");

            // Create WorkOrders table if it doesn't exist
            var createTableQuery = @"
                IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'WorkOrders' AND schema_id = SCHEMA_ID('dbo'))
                BEGIN
                    CREATE TABLE dbo.WorkOrders (
                        id INT IDENTITY(1,1) PRIMARY KEY,
                        workOrderNo VARCHAR(50) NOT NULL,
                        machineNo VARCHAR(50) NOT NULL,
                        operator VARCHAR(50) NOT NULL,
                        orderQty INT NOT NULL,
                        completedQty INT NOT NULL,
                        createdAt DATETIME DEFAULT GETDATE()
                    );
                    PRINT 'WorkOrders table created successfully.';
                END
                ELSE
                BEGIN
                    PRINT 'WorkOrders table already exists.';
                END";

            using (var command = new SqlCommand(createTableQuery, connection))
            {
                await command.ExecuteNonQueryAsync();
                Console.WriteLine("Table creation step completed.");
            }
            
            Console.WriteLine("Database initialization completed successfully");
        }
        catch (SqlException ex)
        {
            Console.WriteLine($"SQL Error Number: {ex.Number}");
            Console.WriteLine($"SQL Error Message: {ex.Message}");
            Console.WriteLine($"SQL Error State: {ex.State}");
            Console.WriteLine($"SQL Error Procedure: {ex.Procedure}");
            Console.WriteLine($"Stack trace: {ex.StackTrace}");
            throw;
        }
        catch (Exception ex)
        {
            Console.WriteLine($"General Error: {ex.GetType().Name}");
            Console.WriteLine($"Error Message: {ex.Message}");
            Console.WriteLine($"Stack trace: {ex.StackTrace}");
            throw;
        }
    }).Wait();
    
    // Return connection with workorderdb
    return new SqlConnection("Server=localhost,1433;Database=workorderdb;User Id=sa;Password=Order@12345;TrustServerCertificate=True;Connection Timeout=30;");
});

var app = builder.Build();

// Configure the HTTP request pipeline
if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

app.UseHttpsRedirection();
app.UseCors();
app.UseAuthorization();

// API Endpoints
app.MapGet("/api/health", () => Results.Ok(new { status = "ok" }));

app.MapGet("/api/workorders", async () =>
{
    using var connection = new SqlConnection("Server=127.0.0.1,1433;Database=workorderdb;User Id=sa;Password=Order@12345;TrustServerCertificate=True;Connection Timeout=30;");
    
    try
    {
        await connection.OpenAsync();
        using var command = new SqlCommand(
            @"SELECT 
                workOrderNo,
                machineNo,
                operator as operatorName,
                orderQty,
                completedQty 
              FROM dbo.WorkOrders 
              ORDER BY createdAt DESC",
            connection);
        
        using var reader = await command.ExecuteReaderAsync();
        var workOrders = new List<dynamic>();
        
        while (await reader.ReadAsync())
        {
            workOrders.Add(new
            {
                workOrderNo = reader["workOrderNo"].ToString(),
                machineNo = reader["machineNo"].ToString(),
                operatorName = reader["operatorName"].ToString(),
                orderQty = Convert.ToInt32(reader["orderQty"]),
                completedQty = Convert.ToInt32(reader["completedQty"])
            });
        }
        
        return Results.Ok(workOrders);
    }
    catch (Exception ex)
    {
        Console.WriteLine($"Database error: {ex.Message}");
        Console.WriteLine($"Stack trace: {ex.StackTrace}");
        return Results.Problem(
            title: "Database Error",
            detail: ex.Message,
            statusCode: 500
        );
    }
    finally
    {
        if (connection.State != ConnectionState.Closed)
        {
            try
            {
                await connection.CloseAsync();
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Error closing connection: {ex.Message}");
            }
        }
    }
});

app.MapPost("/api/workorders", async (WorkOrder workOrder, IDbConnection db) =>
{
    using var connection = new SqlConnection("Server=localhost,1433;Database=workorderdb;User Id=sa;Password=Order@12345;TrustServerCertificate=True;Connection Timeout=30;");
    
    try
    {
        // Only validate required fields
        if (string.IsNullOrEmpty(workOrder.WorkOrderNo) || 
            string.IsNullOrEmpty(workOrder.MachineNo) || 
            string.IsNullOrEmpty(workOrder.OperatorName))
        {
            return Results.BadRequest(new { error = "Work Order No, Machine No, and Operator are required" });
        }

        // Open connection with retry logic
        int maxRetries = 3;
        int retryCount = 0;
        bool connected = false;

        while (!connected && retryCount < maxRetries)
        {
            try
            {
                await connection.OpenAsync();
                connected = true;
            }
            catch (SqlException ex) when (retryCount < maxRetries - 1)
            {
                retryCount++;
                Console.WriteLine($"Connection attempt {retryCount} failed: {ex.Message}");
                await Task.Delay(1000 * retryCount); // Exponential backoff
            }
        }

        if (!connected)
        {
            throw new Exception("Failed to establish database connection after multiple attempts");
        }
        
        // Insert the work order
        using var command = new SqlCommand(
            @"INSERT INTO dbo.WorkOrders (
                workOrderNo,
                machineNo,
                operator,
                orderQty,
                completedQty
            ) VALUES (
                @workOrderNo,
                @machineNo,
                @operator,
                @orderQty,
                @completedQty
            )",
            connection);

        command.Parameters.AddWithValue("@workOrderNo", workOrder.WorkOrderNo);
        command.Parameters.AddWithValue("@machineNo", workOrder.MachineNo);
        command.Parameters.AddWithValue("@operator", workOrder.OperatorName);
        command.Parameters.AddWithValue("@orderQty", workOrder.OrderQty);
        command.Parameters.AddWithValue("@completedQty", workOrder.CompletedQty);

        await command.ExecuteNonQueryAsync();
        return Results.Created($"/api/workorders/{workOrder.WorkOrderNo}", workOrder);
    }
    catch (Exception ex)
    {
        Console.WriteLine($"Error creating work order: {ex.Message}");
        Console.WriteLine($"Stack trace: {ex.StackTrace}");
        return Results.Problem(
            detail: ex.Message,
            title: "Failed to create work order",
            statusCode: 500
        );
    }
    finally
    {
        // Ensure connection is properly closed
        if (connection.State != ConnectionState.Closed)
        {
            try
            {
                await connection.CloseAsync();
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Error closing connection: {ex.Message}");
            }
        }
    }
});

app.MapPut("/api/workorders/{workOrderNo}", async (string workOrderNo, WorkOrder workOrder, IDbConnection db) =>
{
    using var connection = new SqlConnection("Server=localhost,1433;Database=workorderdb;User Id=sa;Password=Order@12345;TrustServerCertificate=True;Connection Timeout=30;");
    
    try
    {
        if (string.IsNullOrEmpty(workOrder.MachineNo) || 
            string.IsNullOrEmpty(workOrder.OperatorName))
        {
            return Results.BadRequest(new { 
                status = "error",
                message = "Machine No and Operator are required" 
            });
        }

        await connection.OpenAsync();

        using var command = new SqlCommand(
            @"UPDATE dbo.WorkOrders 
              SET machineNo = @machineNo, 
                  operator = @operator, 
                  orderQty = @orderQty, 
                  completedQty = @completedQty 
              WHERE workOrderNo = @workOrderNo;

              SELECT 
                workOrderNo,
                machineNo,
                operator as operatorName,
                orderQty,
                completedQty
              FROM dbo.WorkOrders 
              WHERE workOrderNo = @workOrderNo;",
            connection);

        command.Parameters.AddWithValue("@workOrderNo", workOrderNo);
        command.Parameters.AddWithValue("@machineNo", workOrder.MachineNo);
        command.Parameters.AddWithValue("@operator", workOrder.OperatorName);
        command.Parameters.AddWithValue("@orderQty", workOrder.OrderQty);
        command.Parameters.AddWithValue("@completedQty", workOrder.CompletedQty);

        using var reader = await command.ExecuteReaderAsync();
        
        if (await reader.ReadAsync())
        {
            var updatedOrder = new
            {
                workOrderNo = reader["workOrderNo"].ToString(),
                machineNo = reader["machineNo"].ToString(),
                operatorName = reader["operatorName"].ToString(),
                orderQty = Convert.ToInt32(reader["orderQty"]),
                completedQty = Convert.ToInt32(reader["completedQty"]),
                remaining = Convert.ToInt32(reader["orderQty"]) - Convert.ToInt32(reader["completedQty"])
            };

            return Results.Ok(new { 
                status = "success",
                message = "Work order updated successfully",
                data = updatedOrder
            });
        }

        return Results.NotFound(new { 
            status = "error",
            message = $"Work order {workOrderNo} not found" 
        });
    }
    catch (Exception ex)
    {
        Console.WriteLine($"Error updating work order: {ex.Message}");
        Console.WriteLine($"Stack trace: {ex.StackTrace}");
        return Results.Problem(
            title: "Failed to update work order",
            detail: ex.Message,
            statusCode: 500
        );
    }
    finally
    {
        if (connection.State != ConnectionState.Closed)
        {
            await connection.CloseAsync();
        }
    }
});

app.MapDelete("/api/workorders/{workOrderNo}", async (string workOrderNo, IDbConnection db) =>
{
    try
    {
        db.Open();
        using var command = new SqlCommand(
            "DELETE FROM WorkOrders WHERE workOrderNo = @workOrderNo",
            (SqlConnection)db);

        command.Parameters.AddWithValue("@workOrderNo", workOrderNo);

        var rowsAffected = await command.ExecuteNonQueryAsync();
        if (rowsAffected == 0)
            return Results.NotFound("Work order not found");

        return Results.Ok(new { 
            message = "Work order deleted successfully",
            deletedWorkOrderNo = workOrderNo
        });
    }
    catch (Exception ex)
    {
        return Results.Problem($"Failed to delete work order: {ex.Message}");
    }
    finally
    {
        if (db.State == ConnectionState.Open)
            db.Close();
    }
});

// Add Excel import endpoint
app.MapPost("/api/workorders/upload", async (HttpRequest request, IDbConnection db) =>
{
    try
    {
        if (!request.HasFormContentType || request.Form.Files.Count == 0)
        {
            return Results.BadRequest("No file uploaded");
        }

        var file = request.Form.Files[0];
        if (file.Length == 0)
        {
            return Results.BadRequest("Empty file");
        }

        // Set EPPlus license context
        ExcelPackage.LicenseContext = LicenseContext.NonCommercial;

        // Read Excel file
        using var stream = new MemoryStream();
        await file.CopyToAsync(stream);
        stream.Position = 0; // Reset stream position

        using var package = new ExcelPackage(stream);
        var worksheet = package.Workbook.Worksheets[0];

        var rowCount = worksheet.Dimension?.Rows ?? 0;
        var successCount = 0;
        var errorCount = 0;
        var errors = new List<string>();

        // Skip header row
        for (int row = 2; row <= rowCount; row++)
        {
            try
            {
                var workOrder = new WorkOrder
                {
                    WorkOrderNo = worksheet.Cells[row, 1].Text,
                    MachineNo = worksheet.Cells[row, 2].Text,
                    OperatorName = worksheet.Cells[row, 3].Text,
                    OrderQty = int.Parse(worksheet.Cells[row, 4].Text),
                    CompletedQty = int.Parse(worksheet.Cells[row, 5].Text)
                };

                if (string.IsNullOrEmpty(workOrder.WorkOrderNo) || 
                    string.IsNullOrEmpty(workOrder.MachineNo) || 
                    string.IsNullOrEmpty(workOrder.OperatorName))
                {
                    errorCount++;
                    errors.Add($"Row {row}: Missing required fields");
                    continue;
                }

                db.Open();
                using var command = new SqlCommand(
                    @"INSERT INTO WorkOrders (workOrderNo, machineNo, operator, orderQty, completedQty) 
                      VALUES (@workOrderNo, @machineNo, @operator, @orderQty, @completedQty)",
                    (SqlConnection)db);

                command.Parameters.AddWithValue("@workOrderNo", workOrder.WorkOrderNo);
                command.Parameters.AddWithValue("@machineNo", workOrder.MachineNo);
                command.Parameters.AddWithValue("@operator", workOrder.OperatorName);
                command.Parameters.AddWithValue("@orderQty", workOrder.OrderQty);
                command.Parameters.AddWithValue("@completedQty", workOrder.CompletedQty);

                await command.ExecuteNonQueryAsync();
                successCount++;
            }
            catch (Exception ex)
            {
                errorCount++;
                errors.Add($"Row {row}: {ex.Message}");
            }
            finally
            {
                if (db.State == ConnectionState.Open)
                    db.Close();
            }
        }

        return Results.Ok(new { 
            message = "Import completed",
            successCount,
            errorCount,
            errors = errors.Take(10) // Return first 10 errors only
        });
    }
    catch (Exception ex)
    {
        return Results.Problem($"Error processing file: {ex.Message}");
    }
});

// Add this new endpoint after your other endpoints
app.MapGet("/api/debug/table-info", async (IDbConnection db) =>
{
    try
    {
        db.Open();
        using var command = new SqlCommand(@"
            SELECT COLUMN_NAME, DATA_TYPE, IS_NULLABLE
            FROM INFORMATION_SCHEMA.COLUMNS
            WHERE TABLE_NAME = 'WorkOrders'
            ORDER BY ORDINAL_POSITION", (SqlConnection)db);
        
        using var reader = await command.ExecuteReaderAsync();
        var columns = new List<dynamic>();
        
        while (await reader.ReadAsync())
        {
            columns.Add(new
            {
                columnName = reader["COLUMN_NAME"].ToString(),
                dataType = reader["DATA_TYPE"].ToString(),
                isNullable = reader["IS_NULLABLE"].ToString()
            });
        }
        
        return Results.Ok(new { 
            message = "Table structure",
            columns = columns
        });
    }
    catch (Exception ex)
    {
        return Results.Problem($"Failed to get table info: {ex.Message}");
    }
    finally
    {
        if (db.State == ConnectionState.Open)
            db.Close();
    }
});

app.Run();
 