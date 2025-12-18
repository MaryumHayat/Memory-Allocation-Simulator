// Global Variables
let memoryState = {
    firstFit: [],
    bestFit: [],
    worstFit: []
};
let processes = [];
let nextPID = 1;
let totalMemorySize = 1024;
let currentLayout = 'multiple';
let partitionMode = 'fixed';
let algorithmChart = null;
let fragmentationChart = null;

// DOM Elements
const firstFitVisualization = document.getElementById('firstFitVisualization');
const bestFitVisualization = document.getElementById('bestFitVisualization');
const worstFitVisualization = document.getElementById('worstFitVisualization');
const processTableBody = document.querySelector('#processTable tbody');
const memorySizeInput = document.getElementById('memorySize');
const memoryLayoutSelect = document.getElementById('memoryLayout');
const partitionModeSelect = document.getElementById('partitionMode');
const initMemoryBtn = document.getElementById('initMemory');
const addProcessBtn = document.getElementById('addProcess');
const pidInput = document.getElementById('pid');
const processSizeInput = document.getElementById('processSize');
const addRandomProcessBtn = document.getElementById('addRandomProcess');
const addSequenceBtn = document.getElementById('addSequence');
const processSequenceInput = document.getElementById('processSequence');
const compactMemoryBtn = document.getElementById('compactMemory');
const clearAllBtn = document.getElementById('clearAll');
const themeToggleBtn = document.getElementById('themeToggle');
const externalFragSpan = document.getElementById('externalFrag');
const internalFragSpan = document.getElementById('internalFrag');
const memoryUtilSpan = document.getElementById('memoryUtil');
const processCountSpan = document.getElementById('processCount');
const notification = document.getElementById('notification');
const notificationText = document.getElementById('notificationText');
const firstFitFreeBlocks = document.getElementById('firstFitFreeBlocks');
const firstFitExternalFrag = document.getElementById('firstFitExternalFrag');
const bestFitFreeBlocks = document.getElementById('bestFitFreeBlocks');
const bestFitExternalFrag = document.getElementById('bestFitExternalFrag');
const worstFitFreeBlocks = document.getElementById('worstFitFreeBlocks');
const worstFitExternalFrag = document.getElementById('worstFitExternalFrag');
const firstFitMidScale = document.getElementById('firstFitMidScale');
const firstFitEndScale = document.getElementById('firstFitEndScale');
const bestFitMidScale = document.getElementById('bestFitMidScale');
const bestFitEndScale = document.getElementById('bestFitEndScale');
const worstFitMidScale = document.getElementById('worstFitMidScale');
const worstFitEndScale = document.getElementById('worstFitEndScale');

// Block Structure
class MemoryBlock {
    constructor(start, size, isFree = true, pid = null, processSize = 0) {
        this.start = start;
        this.size = size;
        this.end = start + size - 1;
        this.isFree = isFree;
        this.pid = pid;
        this.processSize = processSize;
        this.isPartition = true;
    }

    get internalFragmentation() {
        if (this.isFree || this.processSize === 0) return 0;
        return Math.max(0, this.size - this.processSize);
    }

    clone() {
        const block = new MemoryBlock(
            this.start,
            this.size,
            this.isFree,
            this.pid,
            this.processSize
        );
        block.isPartition = this.isPartition;
        return block;
    }

    get info() {
        if (this.isFree) {
            return `Free Partition: ${this.start}-${this.end} (${this.size}KB)`;
        } else {
            const internalFrag = this.internalFragmentation;
            return `Allocated to ${this.pid}: ${this.start}-${this.end} (${this.processSize}/${this.size}KB, Internal Frag: ${internalFrag}KB)`;
        }
    }
}

// Process Structure
class Process {
    constructor(pid, size) {
        this.pid = pid;
        this.size = size;
        this.firstFitBlock = null;
        this.bestFitBlock = null;
        this.worstFitBlock = null;
        this.internalFragmentation = 0;
    }
}

// Initialize Memory
function initializeMemory() {
    totalMemorySize = parseInt(memorySizeInput.value) || 1024;
    currentLayout = memoryLayoutSelect.value;
    partitionMode = partitionModeSelect.value;
    
    if (totalMemorySize < 64 || totalMemorySize > 10000) {
        showNotification('Memory size must be between 64KB and 10000KB', 'warning');
        memorySizeInput.value = 1024;
        totalMemorySize = 1024;
    }
    
    // Update scale displays
    const midPoint = Math.floor(totalMemorySize / 2);
    firstFitMidScale.textContent = `${midPoint} KB`;
    firstFitEndScale.textContent = `${totalMemorySize} KB`;
    bestFitMidScale.textContent = `${midPoint} KB`;
    bestFitEndScale.textContent = `${totalMemorySize} KB`;
    worstFitMidScale.textContent = `${midPoint} KB`;
    worstFitEndScale.textContent = `${totalMemorySize} KB`;
    
    // Initialize memory state
    initializeMemoryLayout();
    
    processes = [];
    nextPID = 1;
    pidInput.value = 'P1';
    processSizeInput.value = '128';
    processSequenceInput.value = '';
    
    updateAllVisualizations();
    updateProcessTable();
    updateFragmentationStats();
    initializeCharts(); // Initialize charts first
    updateAlgorithmComparison(); // Then update with data
    
    showNotification(`Memory initialized with ${totalMemorySize}KB (${currentLayout} layout, ${partitionMode} mode)`, 'success');
}

// Initialize different memory layouts
function initializeMemoryLayout() {
    memoryState = { firstFit: [], bestFit: [], worstFit: [] };
    
    switch(currentLayout) {
        case 'single':
            const singleBlock = new MemoryBlock(0, totalMemorySize, true);
            memoryState.firstFit = [singleBlock.clone()];
            memoryState.bestFit = [singleBlock.clone()];
            memoryState.worstFit = [singleBlock.clone()];
            break;
            
        case 'multiple':
            memoryState.firstFit = createMultiplePartitions();
            memoryState.bestFit = createMultiplePartitions();
            memoryState.worstFit = createMultiplePartitions();
            break;
            
        case 'fragmented':
            memoryState.firstFit = createFragmentedPartitions();
            memoryState.bestFit = createFragmentedPartitions();
            memoryState.worstFit = createFragmentedPartitions();
            break;
            
        case 'mixed':
            memoryState.firstFit = createMixedPartitions();
            memoryState.bestFit = createMixedPartitions();
            memoryState.worstFit = createMixedPartitions();
            break;
    }
}

// Create multiple partitions that scale with total memory
function createMultiplePartitions() {
    const partitions = [];
    let currentAddress = 0;
    
    let partitionCount;
    if (totalMemorySize <= 512) partitionCount = 2;
    else if (totalMemorySize <= 1536) partitionCount = 3;
    else if (totalMemorySize <= 3072) partitionCount = 4;
    else if (totalMemorySize <= 6144) partitionCount = 5;
    else partitionCount = 6;
    
    const baseSize = Math.floor(totalMemorySize / partitionCount);
    const remainder = totalMemorySize % partitionCount;
    const sizes = [];
    
    for (let i = 0; i < partitionCount; i++) {
        let size = baseSize;
        if (i < remainder) size += 1;
        
        if (i % 2 === 0) size = Math.floor(size * 0.9);
        else size = Math.floor(size * 1.1);
        
        size = Math.max(64, size);
        sizes.push(size);
    }
    
    const total = sizes.reduce((a, b) => a + b, 0);
    const difference = totalMemorySize - total;
    
    if (difference !== 0) {
        sizes[sizes.length - 1] += difference;
    }
    
    sizes.forEach(size => {
        if (size > 0) {
            const partition = new MemoryBlock(currentAddress, size, true);
            partitions.push(partition);
            currentAddress += size;
        }
    });
    
    return partitions;
}

// Create fragmented partitions
function createFragmentedPartitions() {
    const partitions = [];
    let currentAddress = 0;
    
    const fragmentCount = Math.min(8, Math.max(3, Math.floor(totalMemorySize / 500)));
    let remaining = totalMemorySize;
    const sizes = [];
    
    for (let i = 0; i < fragmentCount - 1; i++) {
        const maxSize = Math.floor(remaining * 0.25);
        const minSize = Math.floor(remaining * 0.08);
        const size = Math.floor(Math.random() * (maxSize - minSize)) + minSize;
        
        sizes.push(size);
        remaining -= size;
    }
    
    sizes.push(remaining);
    
    sizes.forEach(size => {
        if (size > 0) {
            const partition = new MemoryBlock(currentAddress, size, true);
            partitions.push(partition);
            currentAddress += size;
        }
    });
    
    return partitions;
}

// Create mixed partitions
function createMixedPartitions() {
    const partitions = [];
    let currentAddress = 0;
    
    let partitionCount;
    if (totalMemorySize <= 2048) partitionCount = 4;
    else if (totalMemorySize <= 6144) partitionCount = 5;
    else partitionCount = 6;
    
    const sizes = [];
    
    for (let i = 0; i < partitionCount - 1; i++) {
        let size;
        if (i === 0) {
            size = Math.floor(totalMemorySize * (0.08 + Math.random() * 0.07));
        } else if (i === 1) {
            size = Math.floor(totalMemorySize * (0.15 + Math.random() * 0.10));
        } else if (i === 2) {
            size = Math.floor(totalMemorySize * (0.20 + Math.random() * 0.10));
        } else {
            size = Math.floor(totalMemorySize * (0.10 + Math.random() * 0.10));
        }
        
        size = Math.max(64, size);
        sizes.push(size);
    }
    
    const used = sizes.reduce((a, b) => a + b, 0);
    const lastSize = totalMemorySize - used;
    sizes.push(Math.max(64, lastSize));
    
    if (lastSize < 0) {
        sizes.length = 0;
        const baseSize = Math.floor(totalMemorySize / partitionCount);
        for (let i = 0; i < partitionCount; i++) {
            sizes.push(baseSize);
        }
        
        const remainder = totalMemorySize % partitionCount;
        for (let i = 0; i < remainder; i++) {
            sizes[i] += 1;
        }
    }
    
    sizes.forEach(size => {
        if (size > 0) {
            const partition = new MemoryBlock(currentAddress, size, true);
            partitions.push(partition);
            currentAddress += size;
        }
    });
    
    return partitions;
}

// Update all visualizations
function updateAllVisualizations() {
    updateAlgorithmVisualization('firstFit', firstFitVisualization, firstFitFreeBlocks, firstFitExternalFrag);
    updateAlgorithmVisualization('bestFit', bestFitVisualization, bestFitFreeBlocks, bestFitExternalFrag);
    updateAlgorithmVisualization('worstFit', worstFitVisualization, worstFitFreeBlocks, worstFitExternalFrag);
}

// Update single algorithm visualization
function updateAlgorithmVisualization(algorithm, container, freeBlocksSpan, externalFragSpan) {
    const memoryBlocks = memoryState[algorithm];
    container.innerHTML = '';
    
    let freeBlocksCount = 0;
    let totalFreeMemory = 0;
    let totalUsed = 0;
    let totalInternalFrag = 0;
    
    memoryBlocks.forEach((block, index) => {
        if (block.isFree) {
            freeBlocksCount++;
            totalFreeMemory += block.size;
        } else {
            totalUsed += block.processSize;
            totalInternalFrag += block.internalFragmentation;
        }
        
        if (block.isPartition && partitionMode === 'fixed' && index < memoryBlocks.length - 1) {
            const partitionSegment = document.createElement('div');
            partitionSegment.className = 'memory-segment partition-border';
            partitionSegment.style.width = '3px';
            partitionSegment.style.backgroundColor = 'transparent';
            partitionSegment.title = 'Partition Boundary';
            container.appendChild(partitionSegment);
        }
        
        const segment = document.createElement('div');
        segment.className = `memory-segment ${block.isFree ? 'free' : 'allocated'}`;
        segment.dataset.index = index;
        
        const widthPercent = (block.size / totalMemorySize) * 100;
        segment.style.width = `${widthPercent}%`;
        
        const content = document.createElement('div');
        content.className = 'segment-content';
        
        if (block.isFree) {
            content.innerHTML = `
                <div class="free-label">FREE</div>
                <div class="size">${block.size} KB</div>
                <div class="internal-frag-label">Partition ${index + 1}</div>
            `;
        } else {
            const internalFrag = block.internalFragmentation;
            content.innerHTML = `
                <div class="pid">${block.pid}</div>
                <div class="size">${block.processSize} KB</div>
                ${internalFrag > 0 ? `<div class="internal-frag-label">Frag: ${internalFrag}KB</div>` : ''}
            `;
            
            if (block.internalFragmentation > 0) {
                const fragOverlay = document.createElement('div');
                fragOverlay.className = 'memory-segment internal-frag';
                fragOverlay.style.width = `${(block.internalFragmentation / block.size) * 100}%`;
                fragOverlay.style.position = 'absolute';
                fragOverlay.style.right = '0';
                fragOverlay.style.top = '0';
                fragOverlay.style.bottom = '0';
                fragOverlay.style.opacity = '0.7';
                fragOverlay.style.zIndex = '1';
                fragOverlay.title = `Internal Fragmentation: ${block.internalFragmentation}KB`;
                segment.appendChild(fragOverlay);
            }
        }
        
        segment.appendChild(content);
        
        segment.addEventListener('mouseenter', (e) => {
            const tooltip = document.getElementById('blockTooltip');
            let tooltipHTML = `
                <h4>${algorithm === 'firstFit' ? 'First Fit' : algorithm === 'bestFit' ? 'Best Fit' : 'Worst Fit'}</h4>
                <p><strong>Status:</strong> ${block.isFree ? 'Free Partition' : 'Allocated to ' + block.pid}</p>
                <p><strong>Range:</strong> ${block.start}-${block.end}</p>
                <p><strong>Size:</strong> ${block.size} KB</p>
            `;
            
            if (!block.isFree) {
                const internalFrag = block.internalFragmentation;
                tooltipHTML += `
                    <p><strong>Process Size:</strong> ${block.processSize} KB</p>
                    <p><strong>Internal Frag:</strong> ${internalFrag} KB</p>
                    <p><strong>Waste:</strong> ${((internalFrag / block.size) * 100).toFixed(1)}%</p>
                `;
            }
            
            tooltip.innerHTML = tooltipHTML;
            tooltip.style.display = 'block';
            tooltip.style.left = `${e.pageX + 10}px`;
            tooltip.style.top = `${e.pageY + 10}px`;
        });
        
        segment.addEventListener('mousemove', (e) => {
            const tooltip = document.getElementById('blockTooltip');
            tooltip.style.left = `${e.pageX + 10}px`;
            tooltip.style.top = `${e.pageY + 10}px`;
        });
        
        segment.addEventListener('mouseleave', () => {
            document.getElementById('blockTooltip').style.display = 'none';
        });
        
        container.appendChild(segment);
    });
    
    freeBlocksSpan.textContent = freeBlocksCount;
    externalFragSpan.textContent = `${totalFreeMemory} KB`;
}

// Update Process Table
function updateProcessTable() {
    processTableBody.innerHTML = '';
    
    processes.forEach(process => {
        const firstFitBlock = findBlockForProcess('firstFit', process.pid);
        const bestFitBlock = findBlockForProcess('bestFit', process.pid);
        const worstFitBlock = findBlockForProcess('worstFit', process.pid);
        
        const firstFitInternalFrag = firstFitBlock ? firstFitBlock.internalFragmentation : 0;
        const bestFitInternalFrag = bestFitBlock ? bestFitBlock.internalFragmentation : 0;
        const worstFitInternalFrag = worstFitBlock ? worstFitBlock.internalFragmentation : 0;
        
        const row = document.createElement('tr');
        row.innerHTML = `
            <td><strong>${process.pid}</strong></td>
            <td>${process.size} KB</td>
            <td><span class="block-address">${firstFitBlock ? `${firstFitBlock.start}-${firstFitBlock.end}` : 'N/A'}</span></td>
            <td><span class="block-address">${bestFitBlock ? `${bestFitBlock.start}-${bestFitBlock.end}` : 'N/A'}</span></td>
            <td><span class="block-address">${worstFitBlock ? `${worstFitBlock.start}-${worstFitBlock.end}` : 'N/A'}</span></td>
            <td>
                <div>First: ${firstFitInternalFrag}KB</div>
                <div>Best: ${bestFitInternalFrag}KB</div>
                <div>Worst: ${worstFitInternalFrag}KB</div>
            </td>
            <td>
                <button class="btn-sm btn-terminate" data-pid="${process.pid}">
                    <i class="fas fa-trash"></i> Terminate
                </button>
            </td>
        `;
        
        processTableBody.appendChild(row);
    });
    
    processCountSpan.textContent = `${processes.length} Process${processes.length !== 1 ? 'es' : ''}`;
    
    document.querySelectorAll('.btn-terminate').forEach(button => {
        button.addEventListener('click', (e) => {
            const pid = e.target.closest('.btn-terminate').dataset.pid;
            terminateProcess(pid);
        });
    });
}

// Find block for a specific process
function findBlockForProcess(algorithm, pid) {
    return memoryState[algorithm].find(block => block.pid === pid);
}

// Allocation Algorithms
function allocateWithAlgorithm(algorithm, pid, size) {
    const memoryBlocks = memoryState[algorithm];
    
    switch(algorithm) {
        case 'firstFit':
            return allocateFirstFit(memoryBlocks, pid, size);
        case 'bestFit':
            return allocateBestFit(memoryBlocks, pid, size);
        case 'worstFit':
            return allocateWorstFit(memoryBlocks, pid, size);
    }
    return null;
}

function allocateFirstFit(memoryBlocks, pid, size) {
    for (let i = 0; i < memoryBlocks.length; i++) {
        const block = memoryBlocks[i];
        if (block.isFree && block.size >= size) {
            return allocateInPartition(block, i, memoryBlocks, pid, size);
        }
    }
    return null;
}

function allocateBestFit(memoryBlocks, pid, size) {
    let bestIndex = -1;
    let bestSize = Infinity;
    
    for (let i = 0; i < memoryBlocks.length; i++) {
        const block = memoryBlocks[i];
        if (block.isFree && block.size >= size && block.size < bestSize) {
            bestSize = block.size;
            bestIndex = i;
        }
    }
    
    if (bestIndex !== -1) {
        return allocateInPartition(memoryBlocks[bestIndex], bestIndex, memoryBlocks, pid, size);
    }
    return null;
}

function allocateWorstFit(memoryBlocks, pid, size) {
    let worstIndex = -1;
    let worstSize = -1;
    
    for (let i = 0; i < memoryBlocks.length; i++) {
        const block = memoryBlocks[i];
        if (block.isFree && block.size >= size && block.size > worstSize) {
            worstSize = block.size;
            worstIndex = i;
        }
    }
    
    if (worstIndex !== -1) {
        return allocateInPartition(memoryBlocks[worstIndex], worstIndex, memoryBlocks, pid, size);
    }
    return null;
}

function allocateInPartition(block, blockIndex, memoryBlocks, pid, size) {
    if (partitionMode === 'fixed') {
        if (block.isFree && block.size >= size) {
            block.isFree = false;
            block.pid = pid;
            block.processSize = size;
            return block.clone();
        }
    } else {
        if (block.size > size) {
            const remainingSize = block.size - size;
            block.isFree = false;
            block.pid = pid;
            block.processSize = size;
            block.size = size;
            block.end = block.start + size - 1;
            block.isPartition = false;
            
            const newFreeBlock = new MemoryBlock(
                block.end + 1,
                remainingSize,
                true
            );
            newFreeBlock.isPartition = false;
            
            memoryBlocks.splice(blockIndex + 1, 0, newFreeBlock);
        } else {
            block.isFree = false;
            block.pid = pid;
            block.processSize = size;
            block.isPartition = false;
        }
    }
    
    return block.clone();
}

// Add Process
function addProcess() {
    const pid = pidInput.value.trim() || `P${nextPID}`;
    const size = parseInt(processSizeInput.value) || 128;
    
    if (size <= 0) {
        showNotification('Process size must be greater than 0', 'warning');
        return;
    }
    
    if (size > totalMemorySize) {
        showNotification(`Process size cannot exceed total memory (${totalMemorySize}KB)`, 'warning');
        return;
    }
    
    if (processes.find(p => p.pid === pid)) {
        showNotification(`Process ${pid} already exists!`, 'warning');
        return;
    }
    
    const algorithms = ['firstFit', 'bestFit', 'worstFit'];
    let successCount = 0;
    
    algorithms.forEach(algorithm => {
        const allocated = allocateWithAlgorithm(algorithm, pid, size);
        if (allocated) successCount++;
    });
    
    if (successCount === 0) {
        showNotification(`Cannot allocate ${size}KB: No suitable partition found!`, 'danger');
        return;
    }
    
    const process = new Process(pid, size);
    processes.push(process);
    
    showNotification(`Process ${pid} (${size}KB) allocated successfully`, 'success');
    
    nextPID++;
    pidInput.value = `P${nextPID}`;
    
    updateAllVisualizations();
    updateProcessTable();
    updateFragmentationStats();
    updateAlgorithmComparison();
}

// Add Random Process
function addRandomProcess() {
    const pid = `P${nextPID}`;
    const size = Math.floor(Math.random() * Math.min(800, totalMemorySize * 0.4)) + 100;
    
    pidInput.value = pid;
    processSizeInput.value = size;
    
    addProcess();
}

// Add Process Sequence
function addProcessSequence() {
    const sequence = processSequenceInput.value.trim();
    if (!sequence) {
        showNotification('Please enter a process sequence', 'warning');
        return;
    }
    
    const processesToAdd = [];
    const parts = sequence.split(',');
    
    parts.forEach(part => {
        const [pidPart, sizePart] = part.trim().split(':');
        if (pidPart && sizePart) {
            const pid = pidPart.trim();
            const size = parseInt(sizePart.trim());
            if (pid && !isNaN(size) && size > 0) {
                processesToAdd.push({ pid, size });
            }
        }
    });
    
    if (processesToAdd.length === 0) {
        showNotification('Invalid format. Use: P1:100, P2:200, P3:150', 'warning');
        return;
    }
    
    let index = 0;
    function addNextProcess() {
        if (index < processesToAdd.length) {
            const { pid, size } = processesToAdd[index];
            pidInput.value = pid;
            processSizeInput.value = size;
            addProcess();
            index++;
            setTimeout(addNextProcess, 800);
        }
    }
    
    addNextProcess();
}

// Terminate Process
function terminateProcess(pid) {
    const processIndex = processes.findIndex(p => p.pid === pid);
    if (processIndex === -1) return;
    
    Object.keys(memoryState).forEach(algorithm => {
        const memoryBlocks = memoryState[algorithm];
        const blockIndex = memoryBlocks.findIndex(b => b.pid === pid);
        
        if (blockIndex !== -1) {
            const block = memoryBlocks[blockIndex];
            block.isFree = true;
            block.pid = null;
            block.processSize = 0;
            
            if (partitionMode === 'fixed') {
                block.isPartition = true;
            }
            
            if (partitionMode === 'dynamic') {
                mergeFreeBlocks(memoryBlocks);
            }
        }
    });
    
    processes.splice(processIndex, 1);
    
    showNotification(`Process ${pid} terminated`, 'info');
    updateAllVisualizations();
    updateProcessTable();
    updateFragmentationStats();
    updateAlgorithmComparison();
}

// Merge free blocks
function mergeFreeBlocks(memoryBlocks) {
    for (let i = memoryBlocks.length - 1; i > 0; i--) {
        const current = memoryBlocks[i];
        const previous = memoryBlocks[i - 1];
        
        if (current.isFree && previous.isFree) {
            current.start = previous.start;
            current.size += previous.size;
            current.end = current.start + current.size - 1;
            memoryBlocks.splice(i - 1, 1);
        }
    }
}

// Compact Memory
function compactMemory() {
    if (partitionMode === 'fixed') {
        showNotification('Compaction not applicable for fixed partitions', 'warning');
        return;
    }
    
    Object.keys(memoryState).forEach(algorithm => {
        const memoryBlocks = memoryState[algorithm];
        let currentAddress = 0;
        const newBlocks = [];
        
        memoryBlocks.forEach(block => {
            if (!block.isFree) {
                const newBlock = new MemoryBlock(
                    currentAddress,
                    block.size,
                    false,
                    block.pid,
                    block.processSize
                );
                newBlocks.push(newBlock);
                currentAddress += block.size;
            }
        });
        
        const freeSpace = totalMemorySize - currentAddress;
        if (freeSpace > 0) {
            const freeBlock = new MemoryBlock(currentAddress, freeSpace, true);
            freeBlock.isPartition = false;
            newBlocks.push(freeBlock);
        }
        
        memoryState[algorithm] = newBlocks;
    });
    
    showNotification('Memory compacted for all algorithms', 'success');
    updateAllVisualizations();
    updateFragmentationStats();
    updateAlgorithmComparison();
}

// Update Fragmentation Statistics
function updateFragmentationStats() {
    let totalInternalFrag = 0;
    let totalExternalFrag = 0;
    let totalAllocated = 0;
    let algorithmCount = 0;
    
    Object.keys(memoryState).forEach(algorithm => {
        const memoryBlocks = memoryState[algorithm];
        let internalFrag = 0;
        let externalFrag = 0;
        let allocated = 0;
        
        memoryBlocks.forEach(block => {
            if (block.isFree) {
                externalFrag += block.size;
            } else {
                internalFrag += block.internalFragmentation;
                allocated += block.processSize;
            }
        });
        
        totalInternalFrag += internalFrag;
        totalExternalFrag += externalFrag;
        totalAllocated += allocated;
        algorithmCount++;
    });
    
    const avgInternalFrag = totalInternalFrag / algorithmCount;
    const avgExternalFrag = totalExternalFrag / algorithmCount;
    const avgAllocated = totalAllocated / algorithmCount;
    
    const internalFragPercent = (avgInternalFrag / totalMemorySize) * 100;
    const externalFragPercent = (avgExternalFrag / totalMemorySize) * 100;
    const memoryUtil = ((avgAllocated + avgInternalFrag) / totalMemorySize) * 100;
    
    externalFragSpan.textContent = `${avgExternalFrag.toFixed(0)} KB (${externalFragPercent.toFixed(1)}%)`;
    externalFragSpan.style.color = externalFragPercent > 50 ? '#ef4444' : externalFragPercent > 20 ? '#f59e0b' : '#10b981';
    
    internalFragSpan.textContent = `${avgInternalFrag.toFixed(0)} KB (${internalFragPercent.toFixed(1)}%)`;
    internalFragSpan.style.color = avgInternalFrag > 100 ? '#f59e0b' : '#10b981';
    
    memoryUtilSpan.textContent = `${memoryUtil.toFixed(1)}%`;
    memoryUtilSpan.style.color = memoryUtil > 80 ? '#10b981' : memoryUtil > 50 ? '#f59e0b' : '#ef4444';
    
    updateFragmentationChart(avgInternalFrag, avgExternalFrag, avgAllocated);
}

// Initialize Charts
function initializeCharts() {
    const algorithmCtx = document.getElementById('algorithmChart').getContext('2d');
    const fragCtx = document.getElementById('fragmentationChart').getContext('2d');
    
    // Destroy existing charts if they exist
    if (algorithmChart) {
        algorithmChart.destroy();
    }
    if (fragmentationChart) {
        fragmentationChart.destroy();
    }
    
    // Create algorithm comparison chart
    algorithmChart = new Chart(algorithmCtx, {
        type: 'bar',
        data: {
            labels: ['First Fit', 'Best Fit', 'Worst Fit'],
            datasets: [
                {
                    label: 'Memory Utilization (%)',
                    data: [0, 0, 0],
                    backgroundColor: 'rgba(76, 175, 80, 0.7)',
                    borderColor: 'rgb(76, 175, 80)',
                    borderWidth: 1
                },
                {
                    label: 'Internal Fragmentation (KB)',
                    data: [0, 0, 0],
                    backgroundColor: 'rgba(255, 152, 0, 0.7)',
                    borderColor: 'rgb(255, 152, 0)',
                    borderWidth: 1
                },
                {
                    label: 'External Fragmentation (KB)',
                    data: [0, 0, 0],
                    backgroundColor: 'rgba(239, 68, 68, 0.7)',
                    borderColor: 'rgb(239, 68, 68)',
                    borderWidth: 1
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: {
                    beginAtZero: true,
                    title: {
                        display: true,
                        text: 'Value',
                        color: 'var(--text-primary)'
                    },
                    ticks: {
                        color: 'var(--text-primary)'
                    },
                    grid: {
                        color: 'var(--border-color)'
                    }
                },
                x: {
                    ticks: {
                        color: 'var(--text-primary)'
                    },
                    grid: {
                        color: 'var(--border-color)'
                    }
                }
            },
            plugins: {
                legend: {
                    position: 'top',
                    labels: {
                        color: 'var(--text-primary)',
                        padding: 20,
                        usePointStyle: true,
                        pointStyle: 'circle'
                    }
                },
                tooltip: {
                    mode: 'index',
                    intersect: false
                }
            },
            animation: {
                duration: 1000,
                easing: 'easeOutQuart'
            }
        }
    });
    
    // Create fragmentation chart
    fragmentationChart = new Chart(fragCtx, {
        type: 'doughnut',
        data: {
            labels: ['Allocated Memory', 'Internal Fragmentation', 'External Fragmentation', 'Free Memory'],
            datasets: [{
                data: [0, 0, 0, 100],
                backgroundColor: [
                    'rgba(76, 175, 80, 0.7)',
                    'rgba(255, 152, 0, 0.7)',
                    'rgba(239, 68, 68, 0.7)',
                    'rgba(148, 163, 184, 0.7)'
                ],
                borderColor: [
                    'rgb(76, 175, 80)',
                    'rgb(255, 152, 0)',
                    'rgb(239, 68, 68)',
                    'rgb(148, 163, 184)'
                ],
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: {
                        color: 'var(--text-primary)',
                        padding: 20,
                        usePointStyle: true,
                        pointStyle: 'circle'
                    }
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            let label = context.label || '';
                            if (label) {
                                label += ': ';
                            }
                            if (context.parsed !== null) {
                                label += context.parsed + '%';
                            }
                            return label;
                        }
                    }
                }
            },
            animation: {
                animateScale: true,
                animateRotate: true,
                duration: 1000
            }
        }
    });
    
    // Force a redraw
    algorithmChart.update();
    fragmentationChart.update();
}

// Update Fragmentation Chart
function updateFragmentationChart(internalFrag, externalFrag, allocated) {
    if (!fragmentationChart) return;
    
    const allocatedPercent = (allocated / totalMemorySize) * 100;
    const internalFragPercent = (internalFrag / totalMemorySize) * 100;
    const externalFragPercent = (externalFrag / totalMemorySize) * 100;
    const freePercent = Math.max(0, 100 - allocatedPercent - internalFragPercent - externalFragPercent);
    
    fragmentationChart.data.datasets[0].data = [
        allocatedPercent,
        internalFragPercent,
        externalFragPercent,
        freePercent
    ];
    
    // Update chart colors based on values
    fragmentationChart.data.datasets[0].backgroundColor = [
        allocatedPercent > 0 ? 'rgba(76, 175, 80, 0.7)' : 'rgba(76, 175, 80, 0.3)',
        internalFragPercent > 0 ? 'rgba(255, 152, 0, 0.7)' : 'rgba(255, 152, 0, 0.3)',
        externalFragPercent > 0 ? 'rgba(239, 68, 68, 0.7)' : 'rgba(239, 68, 68, 0.3)',
        freePercent > 0 ? 'rgba(148, 163, 184, 0.7)' : 'rgba(148, 163, 184, 0.3)'
    ];
    
    fragmentationChart.update();
}

// Update Algorithm Comparison
function updateAlgorithmComparison() {
    if (!algorithmChart) return;
    
    const algorithms = ['firstFit', 'bestFit', 'worstFit'];
    const utilizations = [];
    const internalFrags = [];
    const externalFrags = [];
    
    algorithms.forEach(algorithm => {
        const memoryBlocks = memoryState[algorithm];
        let internalFrag = 0;
        let externalFrag = 0;
        let allocated = 0;
        
        memoryBlocks.forEach(block => {
            if (block.isFree) {
                externalFrag += block.size;
            } else {
                internalFrag += block.internalFragmentation;
                allocated += block.processSize;
            }
        });
        
        const utilization = ((allocated + internalFrag) / totalMemorySize) * 100;
        utilizations.push(utilization);
        internalFrags.push(internalFrag);
        externalFrags.push(externalFrag);
    });
    
    // Update chart data
    algorithmChart.data.datasets[0].data = utilizations;
    algorithmChart.data.datasets[1].data = internalFrags;
    algorithmChart.data.datasets[2].data = externalFrags;
    
    // Update chart colors based on values
    algorithmChart.data.datasets[0].backgroundColor = utilizations.map(u => 
        u > 70 ? 'rgba(76, 175, 80, 0.9)' : u > 40 ? 'rgba(76, 175, 80, 0.7)' : 'rgba(76, 175, 80, 0.5)'
    );
    algorithmChart.data.datasets[1].backgroundColor = internalFrags.map(f => 
        f > totalMemorySize * 0.1 ? 'rgba(255, 152, 0, 0.9)' : f > 0 ? 'rgba(255, 152, 0, 0.7)' : 'rgba(255, 152, 0, 0.5)'
    );
    algorithmChart.data.datasets[2].backgroundColor = externalFrags.map(f => 
        f > totalMemorySize * 0.5 ? 'rgba(239, 68, 68, 0.9)' : f > totalMemorySize * 0.2 ? 'rgba(239, 68, 68, 0.7)' : 'rgba(239, 68, 68, 0.5)'
    );
    
    algorithmChart.update();
}

// Clear All Processes
function clearAllProcesses() {
    if (processes.length === 0) {
        showNotification('No processes to clear', 'info');
        return;
    }
    
    if (confirm('Are you sure you want to terminate all processes?')) {
        processes = [];
        initializeMemoryLayout();
        nextPID = 1;
        pidInput.value = 'P1';
        processSizeInput.value = '128';
        
        showNotification('All processes cleared', 'success');
        updateAllVisualizations();
        updateProcessTable();
        updateFragmentationStats();
        updateAlgorithmComparison();
    }
}

// Show Notification
function showNotification(message, type = 'info') {
    notificationText.textContent = message;
    notification.className = `notification ${type}`;
    notification.style.display = 'flex';
    
    setTimeout(() => {
        hideNotification();
    }, 4000);
}

function hideNotification() {
    notification.style.display = 'none';
}

// Toggle Theme
function toggleTheme() {
    const isDark = document.body.classList.contains('light-theme');
    if (isDark) {
        document.body.classList.remove('light-theme');
        themeToggleBtn.innerHTML = '<i class="fas fa-moon"></i>';
        localStorage.setItem('theme', 'dark');
        
        // Update chart colors for dark theme
        if (algorithmChart) {
            algorithmChart.options.scales.y.ticks.color = '#f1f5f9';
            algorithmChart.options.scales.x.ticks.color = '#f1f5f9';
            algorithmChart.options.scales.y.grid.color = '#475569';
            algorithmChart.options.scales.x.grid.color = '#475569';
            algorithmChart.options.plugins.legend.labels.color = '#f1f5f9';
            algorithmChart.update();
        }
        if (fragmentationChart) {
            fragmentationChart.options.plugins.legend.labels.color = '#f1f5f9';
            fragmentationChart.update();
        }
    } else {
        document.body.classList.add('light-theme');
        themeToggleBtn.innerHTML = '<i class="fas fa-sun"></i>';
        localStorage.setItem('theme', 'light');
        
        // Update chart colors for light theme
        if (algorithmChart) {
            algorithmChart.options.scales.y.ticks.color = '#1e293b';
            algorithmChart.options.scales.x.ticks.color = '#1e293b';
            algorithmChart.options.scales.y.grid.color = '#e2e8f0';
            algorithmChart.options.scales.x.grid.color = '#e2e8f0';
            algorithmChart.options.plugins.legend.labels.color = '#1e293b';
            algorithmChart.update();
        }
        if (fragmentationChart) {
            fragmentationChart.options.plugins.legend.labels.color = '#1e293b';
            fragmentationChart.update();
        }
    }
}

// Update layout descriptions
function updateLayoutDescriptions() {
    const memorySize = parseInt(memorySizeInput.value) || 1024;
    const layoutOptions = memoryLayoutSelect.options;
    
    const layouts = {
        single: `Single Free Block (${memorySize}KB)`,
        multiple: `Multiple Free Blocks (automatically sized)`,
        fragmented: `Fragmented Layout (3-8 fragments)`,
        mixed: `Mixed Sizes (4-6 partitions)`
    };
    
    layoutOptions[0].text = layouts.single;
    layoutOptions[1].text = layouts.multiple;
    layoutOptions[2].text = layouts.fragmented;
    layoutOptions[3].text = layouts.mixed;
}

// Event Listeners
initMemoryBtn.addEventListener('click', initializeMemory);
addProcessBtn.addEventListener('click', addProcess);
addRandomProcessBtn.addEventListener('click', addRandomProcess);
addSequenceBtn.addEventListener('click', addProcessSequence);
compactMemoryBtn.addEventListener('click', compactMemory);
clearAllBtn.addEventListener('click', clearAllProcesses);
themeToggleBtn.addEventListener('click', toggleTheme);

partitionModeSelect.addEventListener('change', () => {
    partitionMode = partitionModeSelect.value;
    initializeMemory();
});

memorySizeInput.addEventListener('input', updateLayoutDescriptions);

processSizeInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        addProcess();
    }
});

processSizeInput.addEventListener('change', () => {
    const size = parseInt(processSizeInput.value) || 0;
    if (size > totalMemorySize) {
        showNotification(`Process size cannot exceed total memory (${totalMemorySize}KB)`, 'warning');
        processSizeInput.value = Math.min(size, totalMemorySize);
    }
});

// Initialize on load
document.addEventListener('DOMContentLoaded', () => {
    const savedTheme = localStorage.getItem('theme') || 'dark';
    if (savedTheme === 'light') {
        document.body.classList.add('light-theme');
        themeToggleBtn.innerHTML = '<i class="fas fa-sun"></i>';
    }
    
    updateLayoutDescriptions();
    initializeMemory();
    
    // REMOVED THE AUTOMATIC DEMO PROCESS ADDITION
    // Charts will be empty initially until user adds processes
});