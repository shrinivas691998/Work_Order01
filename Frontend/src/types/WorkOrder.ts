export interface WorkOrder {
  workOrderNo: string;
  machineNo: string;
  operatorName: string;
  orderQty: number;
  completedQty: number;
}

export interface WorkOrderRequest {
  WorkOrderNo: string;
  MachineNo: string;
  OperatorName: string;
  OrderQty: number;
  CompletedQty: number;
}

export interface ApiResponse<T> {
  data: T | null;
  error: string | null;
  loading: boolean;
}