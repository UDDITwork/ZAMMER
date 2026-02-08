import React, { useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronRight } from 'lucide-react';
import {
  getLevel1Options,
  getLevel2Options,
  getLevel3Options
} from '../../data/categoryHierarchy';

const CategoryMegaMenu = ({ isOpen, onClose }) => {
  const level1List = getLevel1Options();
  const [activeL1, setActiveL1] = useState(level1List[0] || '');
  const [activeL2, setActiveL2] = useState('');

  const level2List = activeL1 ? getLevel2Options(activeL1) : [];
  const currentL2 = activeL2 || level2List[0] || '';
  const level3List = (activeL1 && currentL2) ? getLevel3Options(activeL1, currentL2) : [];

  const handleL1Hover = useCallback((l1) => {
    setActiveL1(l1);
    setActiveL2('');
  }, []);

  const handleL2Hover = useCallback((l2) => {
    setActiveL2(l2);
  }, []);

  const buildLink = (...levels) =>
    '/user/browse/' + levels.map(l => encodeURIComponent(l)).join('/');

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <div className="fixed inset-0 bg-black/10 z-40" onClick={onClose} />
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.18, ease: [0.25, 0.46, 0.45, 0.94] }}
            className="absolute left-0 right-0 top-full z-50"
          >
            <div className="max-w-7xl mx-auto">
              <div className="bg-white rounded-b-2xl shadow-xl border border-t-0 border-gray-200 overflow-hidden">
                <div className="flex min-h-[400px]">

                  {/* Column 1 — Level 1 */}
                  <div className="w-52 border-r border-gray-100 bg-gray-50/70 py-3 flex-shrink-0">
                    {level1List.map((l1) => (
                      <div key={l1} onMouseEnter={() => handleL1Hover(l1)}>
                        <Link
                          to={buildLink(l1)}
                          onClick={onClose}
                          className={`flex items-center justify-between px-5 py-3 text-sm transition-all duration-100 ${
                            activeL1 === l1
                              ? 'bg-white text-gray-900 font-semibold shadow-sm border-r-2 border-orange-500'
                              : 'text-gray-600 hover:text-gray-900 hover:bg-white/60'
                          }`}
                        >
                          <span>{l1}</span>
                          <ChevronRight className={`w-3.5 h-3.5 transition-opacity ${activeL1 === l1 ? 'opacity-100 text-orange-500' : 'opacity-0'}`} />
                        </Link>
                      </div>
                    ))}
                  </div>

                  {/* Column 2 — Level 2 */}
                  <div className="w-56 border-r border-gray-100 py-3 flex-shrink-0 overflow-y-auto">
                    {level2List.map((l2) => (
                      <div key={l2} onMouseEnter={() => handleL2Hover(l2)}>
                        <Link
                          to={buildLink(activeL1, l2)}
                          onClick={onClose}
                          className={`flex items-center justify-between px-5 py-2.5 text-sm transition-all duration-100 ${
                            currentL2 === l2
                              ? 'text-orange-600 font-medium bg-orange-50/60'
                              : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                          }`}
                        >
                          <span>{l2}</span>
                          <ChevronRight className={`w-3 h-3 transition-opacity ${currentL2 === l2 ? 'opacity-100 text-orange-400' : 'opacity-0'}`} />
                        </Link>
                      </div>
                    ))}
                  </div>

                  {/* Column 3 — Level 3 */}
                  <div className="flex-1 py-4 px-6 overflow-y-auto">
                    <div className="flex items-center justify-between mb-3 px-1">
                      <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
                        {currentL2 || 'Select a category'}
                      </p>
                      {currentL2 && (
                        <Link
                          to={buildLink(activeL1, currentL2)}
                          onClick={onClose}
                          className="text-xs font-medium text-orange-600 hover:text-orange-700 transition-colors"
                        >
                          View All
                        </Link>
                      )}
                    </div>
                    <div className="grid grid-cols-2 xl:grid-cols-3 gap-x-6 gap-y-0.5">
                      {level3List.map((l3) => (
                        <Link
                          key={l3}
                          to={buildLink(activeL1, currentL2, l3)}
                          onClick={onClose}
                          className="px-2 py-2 text-sm text-gray-700 hover:text-orange-600 hover:bg-orange-50/40 rounded-md transition-colors duration-100"
                        >
                          {l3}
                        </Link>
                      ))}
                    </div>
                    {level3List.length === 0 && (
                      <p className="text-sm text-gray-400 mt-4 px-1">Hover over a subcategory to see items</p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

export default CategoryMegaMenu;
