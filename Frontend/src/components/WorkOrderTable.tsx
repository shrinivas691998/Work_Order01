import { useState } from 'react';
import { WorkOrder } from '../types/WorkOrder';

interface WorkOrderTableProps {
  workOrders: WorkOrder[];
  onDelete?: (workOrderNo: string) => Promise<void>;
  onUpdate?: (workOrder: WorkOrder) => Promise<void>;
  refetch: () => Promise<void>;
}

export function WorkOrderTable({ workOrders, refetch }: WorkOrderTableProps) {
  const [editingOrder, setEditingOrder] = useState<WorkOrder | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleUpdate = async (workOrder: WorkOrder) => {
    try {
      const response = await fetch(`http://localhost:5069/api/workorders/${workOrder.workOrderNo}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          WorkOrderNo: workOrder.workOrderNo,
          MachineNo: workOrder.machineNo,
          OperatorName: workOrder.operatorName,
          OrderQty: Number(workOrder.orderQty),
          CompletedQty: Number(workOrder.completedQty)
        }),
      });

      const responseData = await response.json();

      if (!response.ok) {
        throw new Error(responseData.message || responseData.detail || 'Failed to update work order');
      }

      await refetch();
      setEditingOrder(null);
    } catch (error) {
      console.error('Error updating work order:', error);
      alert(error instanceof Error ? error.message : 'Failed to update work order');
    }
  };

  const handleEdit = (order: WorkOrder) => {
    setEditingOrder({ ...order }); // Create a copy of the order
  };

  const handleSave = async (order: WorkOrder) => {
    try {
      if (!order.workOrderNo || !order.machineNo || !order.operatorName) {
        alert('Work Order No, Machine No, and Operator are required');
        return;
      }

      await handleUpdate(order);
    } catch (error) {
      console.error('Error saving work order:', error);
      alert(error instanceof Error ? error.message : 'Failed to update work order');
    }
  };

  const handleCancel = () => {
    setEditingOrder(null);
  };

  const handleDelete = async (workOrderNo: string) => {
    if (window.confirm('Are you sure you want to delete this work order?')) {
      try {
        setIsDeleting(true);
        const response = await fetch(`http://localhost:5069/api/workorders/${workOrderNo}`, {
          method: 'DELETE',
          headers: {
            'Content-Type': 'application/json'
          }
        });

        const responseText = await response.text();
        let responseData;
        try {
          responseData = JSON.parse(responseText);
        } catch {
          if (!response.ok) {
            throw new Error('Failed to delete work order');
          }
        }

        if (!response.ok) {
          throw new Error(responseData?.message || 'Failed to delete work order');
        }

        await refetch();
      } catch (error) {
        console.error('Error deleting work order:', error);
        alert(error instanceof Error ? error.message : 'Failed to delete work order');
      } finally {
        setIsDeleting(false);
      }
    }
  };

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full bg-white rounded-lg overflow-hidden">
        <thead className="bg-gray-100">
          <tr>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Work Order No.
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Machine No.
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Operator
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Order Qty
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Completed Qty
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Remaining
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Actions
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-200">
          {workOrders.map((order) => (
            <tr key={order.workOrderNo} className="hover:bg-gray-50">
              {editingOrder?.workOrderNo === order.workOrderNo ? (
                // Editing mode
                <>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    {order.workOrderNo}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    <input
                      type="text"
                      className="border rounded px-2 py-1 w-full"
                      value={editingOrder.machineNo}
                      onChange={(e) => setEditingOrder({ ...editingOrder, machineNo: e.target.value })}
                    />
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    <input
                      type="text"
                      className="border rounded px-2 py-1 w-full"
                      value={editingOrder.operatorName}
                      onChange={(e) => setEditingOrder({ ...editingOrder, operatorName: e.target.value })}
                    />
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    <input
                      type="number"
                      className="border rounded px-2 py-1 w-full"
                      value={editingOrder.orderQty}
                      onChange={(e) => {
                        const value = e.target.value === '' ? 0 : Number(e.target.value);
                        setEditingOrder({ 
                          ...editingOrder, 
                          orderQty: value
                        });
                      }}
                    />
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    <input
                      type="number"
                      className="border rounded px-2 py-1 w-full"
                      value={editingOrder.completedQty}
                      onChange={(e) => {
                        const value = e.target.value === '' ? 0 : Number(e.target.value);
                        setEditingOrder({ 
                          ...editingOrder, 
                          completedQty: value
                        });
                      }}
                    />
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    {editingOrder ? (
                      <span className={`font-medium ${
                        editingOrder.orderQty - editingOrder.completedQty < 0
                          ? 'text-red-600'    // Negative (completed > ordered)
                          : editingOrder.orderQty - editingOrder.completedQty === 0
                            ? 'text-yellow-600' // Zero (completed = ordered)
                            : 'text-green-600'  // Positive (ordered > completed)
                      }`}>
                        {editingOrder.orderQty - editingOrder.completedQty}
                      </span>
                    ) : (
                      <span className={`font-medium ${
                        order.orderQty - order.completedQty < 0
                          ? 'text-red-600'    // Negative (completed > ordered)
                          : order.orderQty - order.completedQty === 0
                            ? 'text-yellow-600' // Zero (completed = ordered)
                            : 'text-green-600'  // Positive (ordered > completed)
                      }`}>
                        {order.orderQty - order.completedQty}
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm space-x-2">
                    <button
                      onClick={() => handleSave(editingOrder)}
                      className="bg-green-500 text-white px-3 py-1 rounded hover:bg-green-600"
                    >
                      Save
                    </button>
                    <button
                      onClick={handleCancel}
                      className="bg-gray-500 text-white px-3 py-1 rounded hover:bg-gray-600"
                    >
                      Cancel
                    </button>
                  </td>
                </>
              ) : (
                // View mode
                <>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {order.workOrderNo}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {order.machineNo}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {order.operatorName}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {order.orderQty}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {order.completedQty}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    <span className={`font-medium ${
                      (order.orderQty || 0) - (order.completedQty || 0) < 0
                        ? 'text-red-600'    // Negative (completed > ordered)
                        : (order.orderQty || 0) - (order.completedQty || 0) === 0
                          ? 'text-yellow-600' // Zero (completed = ordered)
                          : 'text-green-600'  // Positive (ordered > completed)
                    }`}>
                      {(order.orderQty || 0) - (order.completedQty || 0)}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm space-x-2">
                    <button
                      onClick={() => handleEdit(order)}
                      className="bg-blue-500 text-white px-3 py-1 rounded hover:bg-blue-600"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDelete(order.workOrderNo)}
                      disabled={isDeleting}
                      className="bg-red-500 text-white px-3 py-1 rounded hover:bg-red-600 disabled:bg-red-300"
                    >
                      {isDeleting ? 'Deleting...' : 'Delete'}
                    </button>
                  </td>
                </>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}