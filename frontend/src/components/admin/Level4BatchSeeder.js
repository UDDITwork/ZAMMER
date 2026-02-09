import React, { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import { FiUploadCloud, FiRefreshCw, FiCheckCircle, FiXCircle, FiClock, FiAlertCircle } from 'react-icons/fi';
import { seedLevel4Batch, clearLevel4Banners, getLevel4SeedStatus } from '../../services/level4BatchSeedService';

const Level4BatchSeeder = ({ onSeedingComplete }) => {
  const [status, setStatus] = useState(null);
  const [isSeeding, setIsSeeding] = useState(false);
  const [currentBatch, setCurrentBatch] = useState(1);
  const [progress, setProgress] = useState(0);
  const [totalProcessed, setTotalProcessed] = useState(0);
  const [logs, setLogs] = useState([]);

  // Load current status on mount
  useEffect(() => {
    loadStatus();
  }, []);

  const loadStatus = async () => {
    try {
      const response = await getLevel4SeedStatus();
      if (response.success) {
        setStatus(response.data);
        setProgress(response.data.progress);
        setTotalProcessed(response.data.currentCount);
      }
    } catch (error) {
      console.error('Failed to load status:', error);
    }
  };

  const addLog = (message, type = 'info') => {
    const timestamp = new Date().toLocaleTimeString();
    setLogs(prev => [...prev, { timestamp, message, type }]);
  };

  const handleClearAndSeed = async () => {
    if (!window.confirm('This will DELETE all existing Level 4 banners and start fresh seeding in batches of 50. Continue?')) {
      return;
    }

    setIsSeeding(true);
    setCurrentBatch(1);
    setProgress(0);
    setTotalProcessed(0);
    setLogs([]);

    try {
      // Clear existing Level 4 banners
      addLog('Clearing existing Level 4 banners...', 'info');
      const clearResponse = await clearLevel4Banners();
      if (clearResponse.success) {
        addLog(`✓ Cleared ${clearResponse.data.deletedCount} existing banners`, 'success');
      }

      // Start batch seeding
      await startBatchSeeding(1);
    } catch (error) {
      addLog(`✗ Error: ${error.message}`, 'error');
      toast.error('Failed to clear banners');
      setIsSeeding(false);
    }
  };

  const startBatchSeeding = async (batchNumber) => {
    const batchSize = 50;
    const delayBetweenBatches = 3000; // 3 seconds delay

    try {
      addLog(`Processing batch ${batchNumber} (50 banners)...`, 'info');
      setCurrentBatch(batchNumber);

      const response = await seedLevel4Batch(batchNumber, batchSize);

      if (response.success) {
        const { processed, totalProcessed: total, progress: prog, isComplete } = response.data;

        setProgress(prog);
        setTotalProcessed(total);
        addLog(`✓ Batch ${batchNumber}: ${processed} banners seeded (Total: ${total}/250)`, 'success');

        if (isComplete) {
          addLog('✓ All 250 Level 4 banners seeded successfully!', 'success');
          toast.success('Level 4 seeding completed!');
          setIsSeeding(false);
          await loadStatus();
          if (onSeedingComplete) {
            onSeedingComplete();
          }
        } else {
          // Continue with next batch after delay
          addLog(`⏳ Waiting 3 seconds before next batch...`, 'info');
          setTimeout(() => {
            startBatchSeeding(batchNumber + 1);
          }, delayBetweenBatches);
        }
      }
    } catch (error) {
      addLog(`✗ Batch ${batchNumber} failed: ${error.message}`, 'error');
      toast.error(`Batch ${batchNumber} failed`);
      setIsSeeding(false);
    }
  };

  return (
    <div className="bg-gradient-to-br from-blue-50 to-indigo-50 border-2 border-blue-200 rounded-xl p-6 shadow-lg">
      {/* Warning Banner */}
      <div className="bg-yellow-50 border-l-4 border-yellow-400 p-3 mb-4 rounded">
        <div className="flex items-start">
          <FiAlertCircle className="w-5 h-5 text-yellow-600 mt-0.5 mr-2 flex-shrink-0" />
          <div className="text-sm text-yellow-800">
            <p className="font-semibold mb-1">⚠️ Important: Choose ONE seeding method</p>
            <p className="text-xs">
              Use either <strong>"Seed from JSON"</strong> button (top right) to seed all levels at once,
              <strong> OR</strong> use this <strong>"Level 4 Batch Seeder"</strong> for slow controlled seeding.
              Don't use both to avoid conflicts!
            </p>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <FiUploadCloud className="w-6 h-6 text-blue-600" />
            Level 4 Batch Seeder
          </h3>
          <p className="text-sm text-gray-600 mt-1">
            Seed 250 Level 4 banners in batches of 50 (slow & safe)
          </p>
        </div>

        {status && !isSeeding && (
          <button
            onClick={loadStatus}
            className="p-2 text-gray-600 hover:text-blue-600 transition-colors"
            title="Refresh status"
          >
            <FiRefreshCw className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* Current Status */}
      {status && !isSeeding && (
        <div className="bg-white rounded-lg p-4 mb-4 border border-gray-200">
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <div className="text-2xl font-bold text-blue-600">{status.currentCount}</div>
              <div className="text-xs text-gray-600">Seeded</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-gray-400">{status.remainingBanners}</div>
              <div className="text-xs text-gray-600">Remaining</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-green-600">{status.progress}%</div>
              <div className="text-xs text-gray-600">Progress</div>
            </div>
          </div>
          {status.isComplete && (
            <div className="mt-3 flex items-center justify-center gap-2 text-green-600">
              <FiCheckCircle className="w-5 h-5" />
              <span className="font-semibold">All banners seeded!</span>
            </div>
          )}
        </div>
      )}

      {/* Progress Bar */}
      {isSeeding && (
        <div className="mb-6">
          <div className="flex justify-between text-sm text-gray-700 mb-2">
            <span>Batch {currentBatch}/5</span>
            <span>{totalProcessed}/250 banners ({progress}%)</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
            <div
              className="bg-gradient-to-r from-blue-500 to-indigo-600 h-3 rounded-full transition-all duration-500 flex items-center justify-end pr-2"
              style={{ width: `${progress}%` }}
            >
              {progress > 10 && (
                <span className="text-xs text-white font-bold">{progress}%</span>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Logs */}
      {logs.length > 0 && (
        <div className="bg-gray-900 rounded-lg p-4 mb-4 h-48 overflow-y-auto font-mono text-xs">
          {logs.map((log, idx) => (
            <div
              key={idx}
              className={`mb-1 ${
                log.type === 'success'
                  ? 'text-green-400'
                  : log.type === 'error'
                  ? 'text-red-400'
                  : 'text-gray-300'
              }`}
            >
              <span className="text-gray-500">[{log.timestamp}]</span> {log.message}
            </div>
          ))}
        </div>
      )}

      {/* Action Button */}
      <button
        onClick={handleClearAndSeed}
        disabled={isSeeding}
        className={`w-full py-3 px-4 rounded-lg font-semibold text-white transition-all duration-200 flex items-center justify-center gap-2 ${
          isSeeding
            ? 'bg-gray-400 cursor-not-allowed'
            : 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 shadow-lg hover:shadow-xl'
        }`}
      >
        {isSeeding ? (
          <>
            <FiClock className="w-5 h-5 animate-spin" />
            <span>Seeding Batch {currentBatch}/5...</span>
          </>
        ) : (
          <>
            <FiUploadCloud className="w-5 h-5" />
            <span>Start Batch Seeding (250 banners)</span>
          </>
        )}
      </button>

      {!isSeeding && status && !status.isComplete && status.currentCount > 0 && (
        <button
          onClick={() => {
            const nextBatch = Math.floor(status.currentCount / 50) + 1;
            setIsSeeding(true);
            setLogs([]);
            addLog(`Resuming from batch ${nextBatch}...`, 'info');
            startBatchSeeding(nextBatch);
          }}
          className="w-full mt-3 py-2 px-4 rounded-lg font-medium text-blue-700 bg-blue-100 hover:bg-blue-200 transition-colors"
        >
          Resume from Batch {Math.floor(status.currentCount / 50) + 1}
        </button>
      )}
    </div>
  );
};

export default Level4BatchSeeder;
