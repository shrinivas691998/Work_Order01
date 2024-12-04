import React, { useState } from 'react';
import { PlusCircle, Upload } from 'lucide-react';
import { WorkOrderForm } from './components/WorkOrderForm';
import { WorkOrderTable } from './components/WorkOrderTable';
import { ErrorMessage } from './components/ErrorMessage';
import { LoadingSpinner } from './components/LoadingSpinner';
import { ExcelUpload } from './components/ExcelUpload';
import { useWorkOrders } from './hooks/useWorkOrders';
import { WorkOrder } from './types/WorkOrder';

export function App() {
  const [showForm, setShowForm] = useState(false);
  const { data: workOrders, loading, error, createWorkOrder, refetch } = useWorkOrders();

  const handleSubmit = async (workOrder: WorkOrder) => {
    const success = await createWorkOrder(workOrder);
    if (success) {
      setShowForm(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 p-6">
      <div className="max-w-6xl mx-auto">
        <div className="mb-8 flex justify-between items-center">
          <h1 className="text-3xl font-bold text-gray-900">Work Order Management</h1>
          <div className="flex gap-4">
            <ExcelUpload onUploadSuccess={refetch} />
            <button
              onClick={() => setShowForm(true)}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
            >
              <PlusCircle size={20} />
              New Work Order
            </button>
          </div>
        </div>

        {error && <ErrorMessage message={error} />}

        {showForm && (
          <div className="mb-8">
            <WorkOrderForm
              onSubmit={handleSubmit}
              onCancel={() => setShowForm(false)}
            />
          </div>
        )}

        {loading ? (
          <LoadingSpinner />
        ) : (
          <WorkOrderTable 
            workOrders={workOrders || []} 
            refetch={refetch} 
          />
        )}
      </div>
    </div>
  );
}

export default App;