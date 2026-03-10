import { ChevronDownCircle } from 'lucide-react'
import React, { useState } from 'react'
import {FaChevronCircleDown,FaChevronCircleRight,FaChevronCircleLeft, FaDatabase} from 'react-icons/fa'

const CollapsiblePanel = ({title,body,direction}) => {
  const [isOpen, setIsOpen] = useState(true);
  return (
    <div className="flex flex-col h-full bg-slate-700 text-white">
        <h2 className="flex items-center shrink-0 border-b border-slate-600 bg-slate-800">
            <span className="p-2 text-gray-400">
                <FaDatabase/>
            </span>
            <span className="flex-1 p-2 text-left text-sm font-medium truncate">{title}</span>
            <button
                className="p-2 text-gray-400 hover:text-white"
                onClick={() => setIsOpen(v => !v)}
            >
                {isOpen ? <FaChevronCircleLeft/> : <FaChevronCircleRight />}
            </button>
        </h2>
        {isOpen && <div className="flex-1 overflow-auto">{body}</div>}
    </div>
  )
}
export default CollapsiblePanel;