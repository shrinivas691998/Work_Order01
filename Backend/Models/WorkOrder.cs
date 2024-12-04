namespace Backend.Models;

public class WorkOrder
{
    public string? WorkOrderNo { get; set; }
    public string? MachineNo { get; set; }
    public string? OperatorName { get; set; }
    public int OrderQty { get; set; }
    public int CompletedQty { get; set; }
} 