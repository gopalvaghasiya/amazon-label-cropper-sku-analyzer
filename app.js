// Configure PDF.js worker
pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';

// Standard 4x6 inch Thermal Label Dimensions in PDF points (4in x 72pt = 288, 6in x 72pt = 432)
const THERMAL_4X6_WIDTH = 288;
const THERMAL_4X6_HEIGHT = 432;

// Default Verified Webhook URL
const DEFAULT_WEBHOOK_URL = "https://script.google.com/macros/s/AKfycbwKv4I_yFoRYXqHBdCDQDEZkuMzsr0i8unVf-GMtBY9A195s4woPGrwRzu87gsYzY0bPQ/exec";

// =========================================================================
// TAB NAVIGATION & ROUTING CONTROLLER
// =========================================================================
const tabBtnAmazon = document.getElementById('tabBtnAmazon');
const tabBtnMeesho = document.getElementById('tabBtnMeesho');
const tabBtnFlipkart = document.getElementById('tabBtnFlipkart');
const amazonPortal = document.getElementById('amazonPortal');
const meeshoPortal = document.getElementById('meeshoPortal');
const flipkartPortal = document.getElementById('flipkartPortal');

function setActiveTab(tabName, updateHash = true) {
    [tabBtnAmazon, tabBtnMeesho, tabBtnFlipkart].forEach(btn => btn && btn.classList.remove('active'));
    [amazonPortal, meeshoPortal, flipkartPortal].forEach(portal => portal && portal.classList.remove('active'));
    document.body.classList.remove('meesho-active', 'flipkart-active');

    if (tabName === 'meesho') {
        if (tabBtnMeesho) tabBtnMeesho.classList.add('active');
        if (meeshoPortal) meeshoPortal.classList.add('active');
        document.body.classList.add('meesho-active');
        if (updateHash) window.location.hash = 'meesho';
    } else if (tabName === 'flipkart') {
        if (tabBtnFlipkart) tabBtnFlipkart.classList.add('active');
        if (flipkartPortal) flipkartPortal.classList.add('active');
        document.body.classList.add('flipkart-active');
        if (updateHash) window.location.hash = 'flipkart';
    } else {
        if (tabBtnAmazon) tabBtnAmazon.classList.add('active');
        if (amazonPortal) amazonPortal.classList.add('active');
        if (updateHash) window.location.hash = 'amazon';
    }
}

if (tabBtnAmazon) tabBtnAmazon.addEventListener('click', () => setActiveTab('amazon'));
if (tabBtnMeesho) tabBtnMeesho.addEventListener('click', () => setActiveTab('meesho'));
if (tabBtnFlipkart) tabBtnFlipkart.addEventListener('click', () => setActiveTab('flipkart'));

// Initial Tab Routing based on URL hash
window.addEventListener('DOMContentLoaded', () => {
    const hash = window.location.hash.toLowerCase().replace('#', '');
    if (hash === 'meesho') {
        setActiveTab('meesho', false);
    } else if (hash === 'flipkart') {
        setActiveTab('flipkart', false);
    } else {
        setActiveTab('amazon', false);
    }
});

window.addEventListener('hashchange', () => {
    const hash = window.location.hash.toLowerCase().replace('#', '');
    if (hash === 'meesho') {
        setActiveTab('meesho', false);
    } else if (hash === 'flipkart') {
        setActiveTab('flipkart', false);
    } else if (hash === 'amazon') {
        setActiveTab('amazon', false);
    }
});


// =========================================================================
// SHARED UTILITIES & MODAL CONTROLS
// =========================================================================
const customerModal = document.getElementById('customerModal');
const modalTitle = document.getElementById('modalTitle');
const customerList = document.getElementById('customerList');
const closeModal = document.getElementById('closeModal');

if (closeModal && customerModal) {
    closeModal.addEventListener('click', hideModal);
    customerModal.addEventListener('click', (e) => {
        if (e.target === customerModal) hideModal();
    });
}

function showCustomerModal(sku, skuDataMap, portalName = 'SKU') {
    const item = skuDataMap[sku];
    if (!item || !item.customers || item.customers.length === 0) return;
    
    modalTitle.textContent = `${portalName}: ${sku}`;
    customerList.innerHTML = '';
    
    item.customers.forEach(cust => {
        const li = document.createElement('li');
        li.className = 'customer-item';
        li.innerHTML = `
            <span class="customer-name">${cust.name || 'Customer'}</span>
            <span class="order-id-badge">${cust.orderId || 'Order'}</span>
        `;
        customerList.appendChild(li);
    });
    
    customerModal.classList.add('active');
}

function hideModal() {
    if (customerModal) customerModal.classList.remove('active');
}

// Group PDF.js text items into lines based on Y coordinate
function getLinesFromItems(items) {
    const tolerance = 5;
    const rows = [];
    for (const item of items) {
        if (!item.str.trim()) continue;
        const y = item.transform[5];
        const x = item.transform[4];
        let added = false;
        for (const row of rows) {
            if (Math.abs(row.y - y) < tolerance) {
                row.items.push({ text: item.str, x });
                added = true;
                break;
            }
        }
        if (!added) {
            rows.push({ y, items: [{ text: item.str, x }] });
        }
    }
    
    rows.sort((a, b) => b.y - a.y);
    
    const lineStrings = [];
    for (const row of rows) {
        row.items.sort((a, b) => a.x - b.x);
        lineStrings.push(row.items.map(it => it.text).join(" "));
    }
    return lineStrings;
}

// Render previews to grid
async function renderPreviewsToContainer(pdfBytes, containerElement, labelType = 'Shipping Label') {
    containerElement.innerHTML = '';
    const loadingTask = pdfjsLib.getDocument({ data: pdfBytes });
    const pdf = await loadingTask.promise;
    
    for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        
        const card = document.createElement('div');
        card.className = 'preview-card';
        
        const canvasWrapper = document.createElement('div');
        canvasWrapper.className = 'preview-canvas-wrapper';
        
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');
        
        const viewport = page.getViewport({ scale: 1.5 });
        canvas.height = viewport.height;
        canvas.width = viewport.width;
        
        canvasWrapper.appendChild(canvas);
        card.appendChild(canvasWrapper);
        
        const info = document.createElement('div');
        info.className = 'preview-info';
        info.innerHTML = `
            <span>${labelType} (4x6 Thermal)</span>
            <span class="page-number">Page ${i}</span>
        `;
        card.appendChild(info);
        containerElement.appendChild(card);
        
        const renderContext = {
            canvasContext: context,
            viewport: viewport
        };
        await page.render(renderContext).promise;
    }
}

// Direct print helper
function printPDFBytes(pdfBytes) {
    if (!pdfBytes) return;
    const blob = new Blob([pdfBytes], { type: 'application/pdf' });
    const url = URL.createObjectURL(blob);
    
    const iframe = document.createElement('iframe');
    iframe.style.position = 'fixed';
    iframe.style.right = '0';
    iframe.style.bottom = '0';
    iframe.style.width = '0';
    iframe.style.height = '0';
    iframe.style.border = '0';
    iframe.src = url;
    
    document.body.appendChild(iframe);
    
    iframe.onload = () => {
        setTimeout(() => {
            try {
                iframe.contentWindow.focus();
                iframe.contentWindow.print();
            } catch (e) {
                console.error('Iframe print error, falling back to window.open', e);
                const printWin = window.open(url, '_blank');
                if (printWin) {
                    printWin.focus();
                    printWin.print();
                }
            }
            setTimeout(() => {
                if (document.body.contains(iframe)) {
                    document.body.removeChild(iframe);
                }
                URL.revokeObjectURL(url);
            }, 60000);
        }, 300);
    };
}


// =========================================================================
// GOOGLE SHEETS DAILY DISPATCH SYNC ENGINE
// =========================================================================
function parseSkuForGoogleSheet(skuName, rawQty, sellerName) {
    const skuLower = (skuName || '').toLowerCase();
    
    // 1. Detect Gujarati Flavor Name
    let flavor = skuName;
    if (skuLower.includes('sandalwood') || skuLower.includes('chandan') || skuLower.includes('ચંદન')) {
        flavor = 'ચંદન';
    } else if (skuLower.includes('loban') || skuLower.includes('લોબાન')) {
        flavor = 'લોબાન';
    } else if (skuLower.includes('mogra') || skuLower.includes('મોગરા')) {
        flavor = 'મોગરા';
    } else if (skuLower.includes('mix') || skuLower.includes('મિક્સ')) {
        flavor = 'મિક્સ ફ્લેવર';
    } else if (skuLower.includes('rose') || skuLower.includes('gulab') || skuLower.includes('ગુલાબ')) {
        flavor = 'ગુલાબ';
    } else if (skuLower.includes('guggal') || skuLower.includes('guggul') || skuLower.includes('ગુગ્ગલ')) {
        flavor = 'ગુગ્ગલ';
    }
    
    // 2. Detect Pack Size and Grams
    let packSize = '250 GM';
    let grams = 250;
    
    if (skuLower.includes('1000') || skuLower.includes('1 kg') || skuLower.includes('1kg')) {
        packSize = '1 KG';
        grams = 1000;
    } else if (skuLower.includes('500') || skuLower.includes('500 gm') || skuLower.includes('500gm')) {
        packSize = '500 GM';
        grams = 500;
    } else if (skuLower.includes('250') || skuLower.includes('250 gm') || skuLower.includes('250gm')) {
        packSize = '250 GM';
        grams = 250;
    } else if (skuLower.includes('100') || skuLower.includes('100 gm') || skuLower.includes('100gm')) {
        packSize = '100 GM';
        grams = 100;
    }
    
    const qtySold = parseInt(rawQty, 10) || 1;
    const totalGm = qtySold * grams;
    
    const now = new Date();
    const dateStr = `${now.getMonth() + 1}/${now.getDate()}/${now.getFullYear()}`;
    
    let seller = sellerName;
    if (sellerName.toLowerCase().includes('meesho')) seller = 'Mesho';
    else if (sellerName.toLowerCase().includes('amazon')) seller = 'Amazon';
    else if (sellerName.toLowerCase().includes('flipkart')) seller = 'Flipkart';
    
    return [dateStr, flavor, packSize, qtySold, totalGm, seller, ''];
}

async function syncSkuDataToGoogleSheet(skuDataMap, sellerName) {
    const webhookUrl = localStorage.getItem('gsheet_webhook_url') || DEFAULT_WEBHOOK_URL;
    if (!webhookUrl) {
        showGsheetModal();
        alert('Please enter and save your Google Apps Script Webhook URL first.');
        return;
    }
    
    const skus = Object.keys(skuDataMap);
    if (skus.length === 0) {
        alert('No processed SKU data to sync. Please upload a PDF first.');
        return;
    }
    
    const rows = [];
    skus.forEach(sku => {
        const item = skuDataMap[sku];
        const row = parseSkuForGoogleSheet(sku, item.qty, sellerName);
        rows.push(row);
    });
    
    try {
        await fetch(webhookUrl, {
            method: 'POST',
            mode: 'no-cors',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ rows: rows })
        });
        
        alert(`✅ Success! ${rows.length} entries synced to Google Sheet ("Sales Entry Daily" Tab) successfully!`);
    } catch (err) {
        console.error('Google Sheet Sync Error:', err);
        alert('Error syncing to Google Sheet: ' + err.message);
    }
}


// =========================================================================
// AMAZON PORTAL MODULE (4x6 Thermal Format)
// =========================================================================
const AmazonPortal = (() => {
    let currentPdfBytes = null;
    let cleanLabelPdfBytes = null;
    let croppedPdfBytes = null;
    let skuData = {};

    const dropZone = document.getElementById('dropZone');
    const fileInput = document.getElementById('fileInput');
    const statusBadge = document.getElementById('statusBadge');
    const statusText = document.getElementById('statusText');
    const cropHeightSlider = document.getElementById('cropHeightSlider');
    const heightVal = document.getElementById('heightVal');
    const downloadBtn = document.getElementById('downloadBtn');
    const printBtn = document.getElementById('printBtn');
    const amazonGsheetBtn = document.getElementById('amazonGsheetBtn');
    const resetBtn = document.getElementById('resetBtn');
    const searchBar = document.getElementById('searchBar');
    const reportTableBody = document.getElementById('reportTableBody');
    const previewGrid = document.getElementById('previewGrid');

    function init() {
        if (!dropZone) return;

        dropZone.addEventListener('click', () => fileInput.click());
        dropZone.addEventListener('dragover', (e) => {
            e.preventDefault();
            dropZone.classList.add('dragover');
        });
        dropZone.addEventListener('dragleave', () => dropZone.classList.remove('dragover'));
        dropZone.addEventListener('drop', (e) => {
            e.preventDefault();
            dropZone.classList.remove('dragover');
            const files = e.dataTransfer.files;
            if (files.length > 0 && files[0].type === 'application/pdf') {
                handleFile(files[0]);
            } else {
                alert('Please drop a valid Amazon PDF file.');
            }
        });

        fileInput.addEventListener('change', (e) => {
            if (e.target.files.length > 0) {
                handleFile(e.target.files[0]);
            }
        });

        resetBtn.addEventListener('click', reset);

        cropHeightSlider.addEventListener('input', (e) => {
            heightVal.textContent = e.target.value + '%';
        });

        cropHeightSlider.addEventListener('change', async (e) => {
            if (!cleanLabelPdfBytes) return;
            showLoading('Cropping Amazon labels to 4x6 thermal format...');
            try {
                const cropVal = parseInt(e.target.value, 10);
                croppedPdfBytes = await cropAmazonPDF(cleanLabelPdfBytes.slice(0), cropVal);
                await renderPreviewsToContainer(croppedPdfBytes.slice(0), previewGrid, 'Amazon 4x6 Sticker');
                showSuccess('4x6 Thermal labels updated successfully!');
            } catch (err) {
                console.error(err);
                showSuccess('Error adjusting crop height.');
            }
        });

        downloadBtn.addEventListener('click', () => {
            const pdfToDownload = croppedPdfBytes || cleanLabelPdfBytes;
            if (!pdfToDownload) return;
            const blob = new Blob([pdfToDownload], { type: 'application/pdf' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = 'Amazon_4x6_Thermal_Labels.pdf';
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        });

        printBtn.addEventListener('click', () => {
            printPDFBytes(croppedPdfBytes || cleanLabelPdfBytes);
        });

        if (amazonGsheetBtn) {
            amazonGsheetBtn.addEventListener('click', () => syncSkuDataToGoogleSheet(skuData, 'Amazon'));
        }

        searchBar.addEventListener('input', () => {
            renderTable(skuData, searchBar.value.trim());
        });
    }

    async function cropAmazonPDF(pdfBytes, cropPercentage) {
        const srcDoc = await PDFLib.PDFDocument.load(pdfBytes);
        const newDoc = await PDFLib.PDFDocument.create();
        const pages = srcDoc.getPages();
        
        for (let i = 0; i < pages.length; i++) {
            const srcPage = pages[i];
            const { width, height } = srcPage.getSize();
            const keepRatio = cropPercentage / 100;
            const cropH = height * keepRatio;
            const cropY = height * (1 - keepRatio);
            
            const embeddedPage = await newDoc.embedPage(srcPage, {
                left: 0,
                bottom: cropY,
                right: width,
                top: height
            });
            
            const newPage = newDoc.addPage([THERMAL_4X6_WIDTH, THERMAL_4X6_HEIGHT]);
            const margin = 4;
            const availW = THERMAL_4X6_WIDTH - (margin * 2);
            const availH = THERMAL_4X6_HEIGHT - (margin * 2);
            
            const scale = Math.min(availW / width, availH / cropH);
            const drawW = width * scale;
            const drawH = cropH * scale;
            const drawX = margin + (availW - drawW) / 2;
            const drawY = THERMAL_4X6_HEIGHT - margin - drawH;
            
            newPage.drawPage(embeddedPage, {
                x: drawX,
                y: drawY,
                width: drawW,
                height: drawH
            });
        }
        
        return await newDoc.save();
    }

    async function handleFile(file) {
        reset();
        showLoading('Reading Amazon PDF file...');
        
        try {
            const arrayBuffer = await file.arrayBuffer();
            currentPdfBytes = new Uint8Array(arrayBuffer);
            
            showLoading('Analyzing pages & compiling SKU report...');
            const parsed = await parsePDF(currentPdfBytes.slice(0));
            skuData = parsed.skuMap;
            
            renderTable(skuData);
            
            showLoading('Filtering out invoices & formatting 4x6 thermal labels...');
            
            const labelPageDetails = parsed.labelPageIndexes.map(labelIdx => {
                const invoiceIdx = labelIdx + 1;
                const skus = parsed.invoicePageSkus[invoiceIdx] || [];
                const skuSortKey = skus.map(s => s.sku).sort().join(", ") || "";
                return {
                    labelPageIndex: labelIdx,
                    skuSortKey: skuSortKey
                };
            });
            
            labelPageDetails.sort((a, b) => a.skuSortKey.localeCompare(b.skuSortKey));
            const sortedLabelPageIndexes = labelPageDetails.map(item => item.labelPageIndex);
            
            cleanLabelPdfBytes = await extractLabelPages(currentPdfBytes.slice(0), sortedLabelPageIndexes, parsed.invoicePageSkus);
            croppedPdfBytes = await cropAmazonPDF(cleanLabelPdfBytes.slice(0), 100);
            
            showLoading('Generating 4x6 thermal previews...');
            await renderPreviewsToContainer(croppedPdfBytes.slice(0), previewGrid, 'Amazon 4x6 Sticker');
            
            cropHeightSlider.disabled = false;
            downloadBtn.disabled = false;
            printBtn.disabled = false;
            if (amazonGsheetBtn) amazonGsheetBtn.disabled = false;
            resetBtn.disabled = false;
            searchBar.disabled = false;
            
            const labelCount = parsed.labelPageIndexes.length;
            showSuccess(`Processed ${labelCount} Amazon 4x6 label${labelCount !== 1 ? 's' : ''} and ${Object.keys(skuData).length} unique SKU types!`);
        } catch (err) {
            console.error(err);
            showError('Error: ' + err.message);
        }
    }

    async function parsePDF(pdfData) {
        const loadingTask = pdfjsLib.getDocument({ data: pdfData });
        const pdf = await loadingTask.promise;
        const numPages = pdf.numPages;
        
        const labelPageIndexes = [];
        const skuMap = {};
        const invoicePageSkus = {};
        
        for (let i = 1; i <= numPages; i++) {
            const page = await pdf.getPage(i);
            const textContent = await page.getTextContent();
            const lines = getLinesFromItems(textContent.items);
            const fullText = lines.join('\n');
            const fullTextLower = fullText.toLowerCase();
            
            const isInvoice = fullTextLower.includes('tax invoice') || 
                              fullTextLower.includes('invoice number') || 
                              fullTextLower.includes('billing address') || 
                              fullTextLower.includes('triplicate for supplier') ||
                              fullTextLower.includes('authorized signatory');
                              
            if (!isInvoice) {
                labelPageIndexes.push(i - 1);
            } else {
                const orderIdRegex = /(\d{3})\s*-\s*(\d{7})\s*-\s*(\d{7})/;
                const orderIdMatch = fullText.match(orderIdRegex);
                const orderId = orderIdMatch ? `${orderIdMatch[1]}-${orderIdMatch[2]}-${orderIdMatch[3]}` : 'Unknown Order ID';
                
                let customerName = 'Unknown Customer';
                const rightColumnItems = textContent.items.filter(item => item.transform[4] > 280);
                const rightColumnLines = getLinesFromItems(rightColumnItems);
                
                for (let j = 0; j < rightColumnLines.length; j++) {
                    const lineClean = rightColumnLines[j].toLowerCase().replace(/\s+/g, '');
                    if (lineClean.includes('billingaddress') || lineClean.includes('shippingaddress')) {
                        if (j + 1 < rightColumnLines.length) {
                            customerName = rightColumnLines[j + 1].trim();
                            break;
                        }
                    }
                }
                
                const rawFullText = textContent.items.map(it => it.str).join(" ");
                const skuRegex = /[B0-9][A-Z0-9]{9}\s*\(\s*([^)]+)\s*\)/gi;
                const skusFound = [];
                let match;
                while ((match = skuRegex.exec(rawFullText)) !== null) {
                    skusFound.push(match[1].trim());
                }
                
                const qtyRegex = /(?:₹|Rs\.?)\s*[0-9.,]+\s+(\d+)\s+(?:₹|Rs\.?)\s*[0-9.,]+/gi;
                const qtysFound = [];
                while ((match = qtyRegex.exec(fullText)) !== null) {
                    qtysFound.push(parseInt(match[1], 10));
                }
                
                const pageSkus = [];
                for (let j = 0; j < skusFound.length; j++) {
                    const sku = skusFound[j];
                    const qty = qtysFound[j] !== undefined ? qtysFound[j] : 1;
                    
                    pageSkus.push({ sku, qty });
                    
                    if (!skuMap[sku]) {
                        skuMap[sku] = { qty: 0, orders: 0, customers: [] };
                    }
                    skuMap[sku].qty += qty;
                    skuMap[sku].orders += 1;
                    skuMap[sku].customers.push({ name: customerName, orderId: orderId });
                }
                invoicePageSkus[i - 1] = pageSkus;
            }
        }
        
        return { labelPageIndexes, skuMap, invoicePageSkus };
    }

    async function extractLabelPages(pdfBytes, pageIndexes, invoicePageSkus) {
        const srcDoc = await PDFLib.PDFDocument.load(pdfBytes);
        const newDoc = await PDFLib.PDFDocument.create();
        
        const boldFont = await newDoc.embedFont(PDFLib.StandardFonts.HelveticaBold);
        const copiedPages = await newDoc.copyPages(srcDoc, pageIndexes);
        
        for (let idx = 0; idx < copiedPages.length; idx++) {
            const page = copiedPages[idx];
            const labelPageIndex = pageIndexes[idx];
            const invoicePageIndex = labelPageIndex + 1;
            
            const skus = invoicePageSkus[invoicePageIndex];
            if (skus && skus.length > 0) {
                const skuText = skus.map(s => `${s.sku} (x${s.qty})`).join(", ");
                const { width, height } = page.getSize();
                const boxY = height * 0.195;
                page.drawRectangle({
                    x: 40,
                    y: boxY,
                    width: width - 80,
                    height: 30,
                    color: PDFLib.rgb(1, 1, 1),
                });
                
                page.drawText(`SKU: ${skuText}`, {
                    x: 45,
                    y: boxY + 8,
                    size: 18,
                    font: boldFont,
                    color: PDFLib.rgb(0, 0, 0),
                });
            }
            newDoc.addPage(page);
        }
        return await newDoc.save();
    }

    function renderTable(data, filterQuery = '') {
        reportTableBody.innerHTML = '';
        const query = filterQuery.toLowerCase();
        
        let totalQty = 0;
        let totalOrders = 0;
        let skuCount = 0;
        
        const sortedSkus = Object.keys(data).sort();
        
        for (const sku of sortedSkus) {
            if (query && !sku.toLowerCase().includes(query)) continue;
            
            const item = data[sku];
            totalQty += item.qty;
            totalOrders += item.orders;
            skuCount++;
            
            const row = document.createElement('tr');
            row.innerHTML = `
                <td class="sku-cell" data-sku="${sku}">${sku}</td>
                <td class="qty-cell">${item.qty}</td>
                <td>${item.orders}</td>
            `;
            
            row.querySelector('.sku-cell').addEventListener('click', (e) => {
                const selectedSku = e.target.getAttribute('data-sku');
                showCustomerModal(selectedSku, skuData, 'Amazon Customers for SKU');
            });
            
            reportTableBody.appendChild(row);
        }
        
        if (skuCount > 0) {
            const totalRow = document.createElement('tr');
            totalRow.className = 'total-row';
            totalRow.innerHTML = `
                <td>TOTAL</td>
                <td class="qty-cell">${totalQty}</td>
                <td>${totalOrders}</td>
            `;
            reportTableBody.appendChild(totalRow);
        } else {
            reportTableBody.innerHTML = `
                <tr>
                    <td colspan="3">
                        <div class="empty-state">
                            <div class="empty-state-icon">🔍</div>
                            <div>No Amazon SKUs match search.</div>
                        </div>
                    </td>
                </tr>
            `;
        }
    }

    function showLoading(text) {
        statusBadge.style.display = 'flex';
        statusBadge.className = 'status-badge loading';
        statusText.textContent = text;
    }

    function showSuccess(text) {
        statusBadge.style.display = 'flex';
        statusBadge.className = 'status-badge success';
        statusText.textContent = text;
    }

    function showError(text) {
        statusBadge.style.display = 'flex';
        statusBadge.style.background = 'rgba(239, 68, 68, 0.1)';
        statusBadge.style.borderColor = 'rgba(239, 68, 68, 0.2)';
        statusBadge.style.color = 'var(--danger)';
        statusText.textContent = text;
    }

    function reset() {
        currentPdfBytes = null;
        cleanLabelPdfBytes = null;
        croppedPdfBytes = null;
        skuData = {};
        
        fileInput.value = '';
        statusBadge.style.display = 'none';
        cropHeightSlider.disabled = true;
        cropHeightSlider.value = 100;
        heightVal.textContent = '100%';
        downloadBtn.disabled = true;
        printBtn.disabled = true;
        if (amazonGsheetBtn) amazonGsheetBtn.disabled = true;
        resetBtn.disabled = true;
        searchBar.disabled = true;
        searchBar.value = '';
        
        reportTableBody.innerHTML = `
            <tr>
                <td colspan="3">
                    <div class="empty-state">
                        <div class="empty-state-icon">📊</div>
                        <div>Upload an Amazon PDF to view the SKU reports here</div>
                    </div>
                </td>
            </tr>
        `;
        
        previewGrid.innerHTML = `
            <div class="empty-state" style="grid-column: 1 / -1; width: 100%;">
                <div class="empty-state-icon">👁️</div>
                <div>Page previews will be generated here</div>
            </div>
        `;
    }

    return { init, reset };
})();


// =========================================================================
// MEESHO PORTAL MODULE (4x6 Thermal Format)
// =========================================================================
const MeeshoPortal = (() => {
    let currentPdfBytes = null;
    let croppedPdfBytes = null;
    let skuData = {};

    const meeshoDropZone = document.getElementById('meeshoDropZone');
    const meeshoFileInput = document.getElementById('meeshoFileInput');
    const meeshoStatusBadge = document.getElementById('meeshoStatusBadge');
    const meeshoStatusText = document.getElementById('meeshoStatusText');
    const meeshoCropHeightSlider = document.getElementById('meeshoCropHeightSlider');
    const meeshoHeightVal = document.getElementById('meeshoHeightVal');
    const meeshoDownloadBtn = document.getElementById('meeshoDownloadBtn');
    const meeshoPrintBtn = document.getElementById('meeshoPrintBtn');
    const meeshoGsheetBtn = document.getElementById('meeshoGsheetBtn');
    const meeshoResetBtn = document.getElementById('meeshoResetBtn');
    const meeshoSearchBar = document.getElementById('meeshoSearchBar');
    const meeshoReportTableBody = document.getElementById('meeshoReportTableBody');
    const meeshoPreviewGrid = document.getElementById('meeshoPreviewGrid');

    function init() {
        if (!meeshoDropZone) return;

        meeshoDropZone.addEventListener('click', () => meeshoFileInput.click());
        meeshoDropZone.addEventListener('dragover', (e) => {
            e.preventDefault();
            meeshoDropZone.classList.add('dragover');
        });
        meeshoDropZone.addEventListener('dragleave', () => meeshoDropZone.classList.remove('dragover'));
        meeshoDropZone.addEventListener('drop', (e) => {
            e.preventDefault();
            meeshoDropZone.classList.remove('dragover');
            const files = e.dataTransfer.files;
            if (files.length > 0 && files[0].type === 'application/pdf') {
                handleFile(files[0]);
            } else {
                alert('Please drop a valid Meesho PDF file.');
            }
        });

        meeshoFileInput.addEventListener('change', (e) => {
            if (e.target.files.length > 0) {
                handleFile(e.target.files[0]);
            }
        });

        meeshoResetBtn.addEventListener('click', reset);

        meeshoCropHeightSlider.addEventListener('input', (e) => {
            meeshoHeightVal.textContent = e.target.value + '%';
        });

        meeshoCropHeightSlider.addEventListener('change', async (e) => {
            if (!currentPdfBytes) return;
            showLoading('Formatting Meesho labels for 4x6 thermal printer...');
            try {
                const cropVal = parseInt(e.target.value, 10);
                croppedPdfBytes = await cropMeeshoTo4x6(currentPdfBytes.slice(0), cropVal);
                await renderPreviewsToContainer(croppedPdfBytes.slice(0), meeshoPreviewGrid, 'Meesho 4x6 Sticker');
                showSuccess('Meesho 4x6 labels formatted successfully!');
            } catch (err) {
                console.error(err);
                showSuccess('Error adjusting crop height.');
            }
        });

        meeshoDownloadBtn.addEventListener('click', () => {
            if (!croppedPdfBytes) return;
            const blob = new Blob([croppedPdfBytes], { type: 'application/pdf' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = 'Meesho_4x6_Thermal_Labels.pdf';
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        });

        meeshoPrintBtn.addEventListener('click', () => {
            printPDFBytes(croppedPdfBytes);
        });

        if (meeshoGsheetBtn) {
            meeshoGsheetBtn.addEventListener('click', () => syncSkuDataToGoogleSheet(skuData, 'Meesho'));
        }

        meeshoSearchBar.addEventListener('input', () => {
            renderTable(skuData, meeshoSearchBar.value.trim());
        });
    }

    async function cropMeeshoTo4x6(pdfBytes, cropPercentage) {
        const srcDoc = await PDFLib.PDFDocument.load(pdfBytes);
        const newDoc = await PDFLib.PDFDocument.create();
        const pages = srcDoc.getPages();
        
        for (let i = 0; i < pages.length; i++) {
            const srcPage = pages[i];
            const { width, height } = srcPage.getSize();
            const keepRatio = cropPercentage / 100;
            const cropH = height * keepRatio;
            const cropY = height * (1 - keepRatio);
            
            const embeddedPage = await newDoc.embedPage(srcPage, {
                left: 0,
                bottom: cropY,
                right: width,
                top: height
            });
            
            const newPage = newDoc.addPage([THERMAL_4X6_WIDTH, THERMAL_4X6_HEIGHT]);
            const margin = 4;
            const availW = THERMAL_4X6_WIDTH - (margin * 2);
            const availH = THERMAL_4X6_HEIGHT - (margin * 2);
            
            const scale = Math.min(availW / width, availH / cropH);
            const drawW = width * scale;
            const drawH = cropH * scale;
            const drawX = margin + (availW - drawW) / 2;
            const drawY = THERMAL_4X6_HEIGHT - margin - drawH;
            
            newPage.drawPage(embeddedPage, {
                x: drawX,
                y: drawY,
                width: drawW,
                height: drawH
            });
        }
        
        return await newDoc.save();
    }

    async function handleFile(file) {
        reset();
        showLoading('Reading Meesho PDF file...');
        
        try {
            const arrayBuffer = await file.arrayBuffer();
            const rawPdfBytes = new Uint8Array(arrayBuffer);
            
            showLoading('Parsing Meesho orders & compiling SKU picklist...');
            const parsed = await parseMeeshoPDF(rawPdfBytes.slice(0));
            skuData = parsed.skuMap;
            
            renderTable(skuData);
            
            showLoading('Sorting Meesho labels by SKU...');
            
            const pageDetails = parsed.pageSkusList.map((item, idx) => ({
                pageIndex: idx,
                skuKey: (item.skus && item.skus.length > 0) ? item.skus[0].sku : `PAGE_${idx}`
            }));
            
            pageDetails.sort((a, b) => a.skuKey.localeCompare(b.skuKey));
            const sortedPageIndexes = pageDetails.map(p => p.pageIndex);
            
            const srcDoc = await PDFLib.PDFDocument.load(rawPdfBytes.slice(0));
            const sortedDoc = await PDFLib.PDFDocument.create();
            const copiedPages = await sortedDoc.copyPages(srcDoc, sortedPageIndexes);
            for (const p of copiedPages) {
                sortedDoc.addPage(p);
            }
            currentPdfBytes = await sortedDoc.save();
            
            showLoading('Cropping & fitting Meesho labels onto 4x6 thermal format...');
            const cropVal = parseInt(meeshoCropHeightSlider.value, 10) || 100;
            croppedPdfBytes = await cropMeeshoTo4x6(currentPdfBytes.slice(0), cropVal);
            
            showLoading('Generating Meesho 4x6 previews...');
            await renderPreviewsToContainer(croppedPdfBytes.slice(0), meeshoPreviewGrid, 'Meesho 4x6 Sticker');
            
            meeshoCropHeightSlider.disabled = false;
            meeshoDownloadBtn.disabled = false;
            meeshoPrintBtn.disabled = false;
            if (meeshoGsheetBtn) meeshoGsheetBtn.disabled = false;
            meeshoResetBtn.disabled = false;
            meeshoSearchBar.disabled = false;
            
            const totalLabels = parsed.pageSkusList.length;
            showSuccess(`Processed ${totalLabels} Meesho 4x6 label${totalLabels !== 1 ? 's' : ''} and ${Object.keys(skuData).length} unique SKU types!`);
        } catch (err) {
            console.error(err);
            showError('Error: ' + err.message);
        }
    }

    async function parseMeeshoPDF(pdfData) {
        const loadingTask = pdfjsLib.getDocument({ data: pdfData });
        const pdf = await loadingTask.promise;
        const numPages = pdf.numPages;
        
        const skuMap = {};
        const pageSkusList = [];
        
        for (let i = 1; i <= numPages; i++) {
            const page = await pdf.getPage(i);
            const textContent = await page.getTextContent();
            const lines = getLinesFromItems(textContent.items);
            const fullText = lines.join('\n');
            
            let orderId = `MEESHO_${i}`;
            const subOrderMatch = fullText.match(/(?:sub[\s_-]*order(?:\s*no|\s*id|\s*#)?|order\s*id|order\s*no)[\s:]*([A-Za-z0-9_-]+)/i);
            if (subOrderMatch) {
                orderId = subOrderMatch[1].trim();
            } else {
                const numericOrderIdMatch = fullText.match(/\b(\d{9,12}_\d+)\b/);
                if (numericOrderIdMatch) {
                    orderId = numericOrderIdMatch[1];
                }
            }
            
            let customerName = 'Customer';
            const shipToMatch = fullText.match(/(?:ship\s*to|deliver\s*to|customer\s*name|buyer)[\s:]*([^\n\r,]+)/i);
            if (shipToMatch && shipToMatch[1].trim()) {
                customerName = shipToMatch[1].trim();
            } else {
                for (let j = 0; j < lines.length; j++) {
                    const l = lines[j].toLowerCase();
                    if (l.includes('delivery address') || l.includes('shipping address') || l.includes('customer address')) {
                        if (j + 1 < lines.length) {
                            customerName = lines[j + 1].trim();
                            break;
                        }
                    }
                }
            }
            
            const pageSkus = [];
            const skuRegexA = /(?:seller\s*sku|sku\s*code|sku\s*id|sku)[\s:#-]+([^\n\r,;()]+)/gi;
            let match;
            while ((match = skuRegexA.exec(fullText)) !== null) {
                let skuCandidate = match[1].trim();
                skuCandidate = skuCandidate.replace(/(?:qty|quantity|size|color|var).*/i, '').trim();
                if (skuCandidate && skuCandidate.length > 1 && !skuCandidate.toLowerCase().includes('invoice')) {
                    pageSkus.push(skuCandidate);
                }
            }
            
            if (pageSkus.length === 0) {
                const prodMatch = fullText.match(/(?:product\s*name|product|item\s*name|item\s*description)[\s:#-]+([^\n\r,;]+)/i);
                if (prodMatch && prodMatch[1].trim()) {
                    pageSkus.push(prodMatch[1].trim());
                }
            }
            
            if (pageSkus.length === 0) {
                pageSkus.push(`Meesho Order Item (Page ${i})`);
            }
            
            let qty = 1;
            const qtyMatch = fullText.match(/(?:qty|quantity|units?)[\s:#-]+(\d+)/i);
            if (qtyMatch) {
                qty = parseInt(qtyMatch[1], 10) || 1;
            }
            
            const uniquePageSkus = [...new Set(pageSkus)];
            const recordedPageSkus = [];
            
            uniquePageSkus.forEach(sku => {
                recordedPageSkus.push({ sku, qty });
                if (!skuMap[sku]) {
                    skuMap[sku] = { qty: 0, orders: 0, customers: [] };
                }
                skuMap[sku].qty += qty;
                skuMap[sku].orders += 1;
                skuMap[sku].customers.push({ name: customerName, orderId: orderId });
            });
            
            pageSkusList.push({
                pageIndex: i - 1,
                skus: recordedPageSkus,
                customer: customerName,
                orderId: orderId
            });
        }
        
        return { skuMap, pageSkusList };
    }

    function renderTable(data, filterQuery = '') {
        meeshoReportTableBody.innerHTML = '';
        const query = filterQuery.toLowerCase();
        
        let totalQty = 0;
        let totalOrders = 0;
        let skuCount = 0;
        
        const sortedSkus = Object.keys(data).sort();
        
        for (const sku of sortedSkus) {
            if (query && !sku.toLowerCase().includes(query)) continue;
            
            const item = data[sku];
            totalQty += item.qty;
            totalOrders += item.orders;
            skuCount++;
            
            const row = document.createElement('tr');
            row.innerHTML = `
                <td class="sku-cell" data-sku="${sku}">${sku}</td>
                <td class="qty-cell">${item.qty}</td>
                <td>${item.orders}</td>
            `;
            
            row.querySelector('.sku-cell').addEventListener('click', (e) => {
                const selectedSku = e.target.getAttribute('data-sku');
                showCustomerModal(selectedSku, skuData, 'Meesho Customers for SKU');
            });
            
            meeshoReportTableBody.appendChild(row);
        }
        
        if (skuCount > 0) {
            const totalRow = document.createElement('tr');
            totalRow.className = 'total-row';
            totalRow.innerHTML = `
                <td>TOTAL</td>
                <td class="qty-cell">${totalQty}</td>
                <td>${totalOrders}</td>
            `;
            meeshoReportTableBody.appendChild(totalRow);
        } else {
            meeshoReportTableBody.innerHTML = `
                <tr>
                    <td colspan="3">
                        <div class="empty-state">
                            <div class="empty-state-icon">🔍</div>
                            <div>No Meesho SKUs match search.</div>
                        </div>
                    </td>
                </tr>
            `;
        }
    }

    function showLoading(text) {
        meeshoStatusBadge.style.display = 'flex';
        meeshoStatusBadge.className = 'status-badge loading';
        meeshoStatusText.textContent = text;
    }

    function showSuccess(text) {
        meeshoStatusBadge.style.display = 'flex';
        meeshoStatusBadge.className = 'status-badge success';
        meeshoStatusText.textContent = text;
    }

    function showError(text) {
        meeshoStatusBadge.style.display = 'flex';
        meeshoStatusBadge.style.background = 'rgba(239, 68, 68, 0.1)';
        meeshoStatusBadge.style.borderColor = 'rgba(239, 68, 68, 0.2)';
        meeshoStatusBadge.style.color = 'var(--danger)';
        meeshoStatusText.textContent = text;
    }

    function reset() {
        currentPdfBytes = null;
        croppedPdfBytes = null;
        skuData = {};
        
        meeshoFileInput.value = '';
        meeshoStatusBadge.style.display = 'none';
        meeshoCropHeightSlider.disabled = true;
        meeshoCropHeightSlider.value = 100;
        meeshoHeightVal.textContent = '100%';
        meeshoDownloadBtn.disabled = true;
        meeshoPrintBtn.disabled = true;
        if (meeshoGsheetBtn) meeshoGsheetBtn.disabled = true;
        meeshoResetBtn.disabled = true;
        meeshoSearchBar.disabled = true;
        meeshoSearchBar.value = '';
        
        meeshoReportTableBody.innerHTML = `
            <tr>
                <td colspan="3">
                    <div class="empty-state">
                        <div class="empty-state-icon">🛍️</div>
                        <div>Upload a Meesho PDF to view SKU summary and order picklists</div>
                    </div>
                </td>
            </tr>
        `;
        
        meeshoPreviewGrid.innerHTML = `
            <div class="empty-state" style="grid-column: 1 / -1; width: 100%;">
                <div class="empty-state-icon">👁️</div>
                <div>Meesho label previews will appear here</div>
            </div>
        `;
    }

    return { init, reset };
})();


// =========================================================================
// FLIPKART & SHOPSY PORTAL MODULE (TRUE 4x6 INCH THERMAL CROPPER)
// =========================================================================
const FlipkartPortal = (() => {
    let currentPdfBytes = null;
    let croppedPdfBytes = null;
    let skuData = {};
    let pageStickerBoxes = [];

    const flipkartDropZone = document.getElementById('flipkartDropZone');
    const flipkartFileInput = document.getElementById('flipkartFileInput');
    const flipkartStatusBadge = document.getElementById('flipkartStatusBadge');
    const flipkartStatusText = document.getElementById('flipkartStatusText');
    const flipkartCropHeightSlider = document.getElementById('flipkartCropHeightSlider');
    const flipkartHeightVal = document.getElementById('flipkartHeightVal');
    const flipkartDownloadBtn = document.getElementById('flipkartDownloadBtn');
    const flipkartPrintBtn = document.getElementById('flipkartPrintBtn');
    const flipkartGsheetBtn = document.getElementById('flipkartGsheetBtn');
    const flipkartResetBtn = document.getElementById('flipkartResetBtn');
    const flipkartSearchBar = document.getElementById('flipkartSearchBar');
    const flipkartReportTableBody = document.getElementById('flipkartReportTableBody');
    const flipkartPreviewGrid = document.getElementById('flipkartPreviewGrid');

    function init() {
        if (!flipkartDropZone) return;

        flipkartDropZone.addEventListener('click', () => flipkartFileInput.click());
        flipkartDropZone.addEventListener('dragover', (e) => {
            e.preventDefault();
            flipkartDropZone.classList.add('dragover');
        });
        flipkartDropZone.addEventListener('dragleave', () => flipkartDropZone.classList.remove('dragover'));
        flipkartDropZone.addEventListener('drop', (e) => {
            e.preventDefault();
            flipkartDropZone.classList.remove('dragover');
            const files = e.dataTransfer.files;
            if (files.length > 0 && files[0].type === 'application/pdf') {
                handleFile(files[0]);
            } else {
                alert('Please drop a valid Flipkart / Shopsy PDF file.');
            }
        });

        flipkartFileInput.addEventListener('change', (e) => {
            if (e.target.files.length > 0) {
                handleFile(e.target.files[0]);
            }
        });

        flipkartResetBtn.addEventListener('click', reset);

        flipkartCropHeightSlider.addEventListener('input', (e) => {
            flipkartHeightVal.textContent = e.target.value + '%';
        });

        flipkartCropHeightSlider.addEventListener('change', async (e) => {
            if (!currentPdfBytes) return;
            showLoading('Re-cropping Flipkart stickers to 4x6 thermal format...');
            try {
                const cropVal = parseInt(e.target.value, 10);
                croppedPdfBytes = await cropFlipkartTo4x6Thermal(currentPdfBytes.slice(0), cropVal, pageStickerBoxes);
                await renderPreviewsToContainer(croppedPdfBytes.slice(0), flipkartPreviewGrid, 'Flipkart 4x6 Sticker');
                showSuccess('Flipkart 4x6 thermal stickers cropped successfully!');
            } catch (err) {
                console.error(err);
                showSuccess('Error adjusting crop height.');
            }
        });

        flipkartDownloadBtn.addEventListener('click', () => {
            if (!croppedPdfBytes) return;
            const blob = new Blob([croppedPdfBytes], { type: 'application/pdf' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = 'Flipkart_4x6_Thermal_Stickers.pdf';
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        });

        flipkartPrintBtn.addEventListener('click', () => {
            printPDFBytes(croppedPdfBytes);
        });

        if (flipkartGsheetBtn) {
            flipkartGsheetBtn.addEventListener('click', () => syncSkuDataToGoogleSheet(skuData, 'Flipkart'));
        }

        flipkartSearchBar.addEventListener('input', () => {
            renderTable(skuData, flipkartSearchBar.value.trim());
        });
    }

    async function cropFlipkartTo4x6Thermal(pdfBytes, cropPercentage = 48, stickerBoxes = []) {
        const srcDoc = await PDFLib.PDFDocument.load(pdfBytes);
        const newDoc = await PDFLib.PDFDocument.create();
        const numPages = srcDoc.getPageCount();

        for (let i = 0; i < numPages; i++) {
            const srcPage = srcDoc.getPage(i);
            const { width: srcW, height: srcH } = srcPage.getSize();

            const userCutRatio = (cropPercentage || 48) / 100;
            const bottomY = srcH * (1 - userCutRatio);
            
            let box = {
                left: srcW * 0.175,
                right: srcW * 0.825,
                bottom: bottomY,
                top: srcH * 0.985
            };

            if (stickerBoxes[i]) {
                const auto = stickerBoxes[i];
                box.left = Math.max(0, Math.min(box.left, auto.minX - 8));
                box.right = Math.min(srcW, Math.max(box.right, auto.maxX + 8));
                box.top = Math.min(srcH, Math.max(box.top, auto.maxY + 10));
            }

            const cropW = box.right - box.left;
            const cropH = box.top - box.bottom;

            const embeddedPage = await newDoc.embedPage(srcPage, {
                left: box.left,
                bottom: box.bottom,
                right: box.right,
                top: box.top
            });

            const newPage = newDoc.addPage([THERMAL_4X6_WIDTH, THERMAL_4X6_HEIGHT]);

            const margin = 4;
            const availW = THERMAL_4X6_WIDTH - (margin * 2);
            const availH = THERMAL_4X6_HEIGHT - (margin * 2);

            const scale = Math.min(availW / cropW, availH / cropH);
            const drawW = cropW * scale;
            const drawH = cropH * scale;

            const drawX = margin + (availW - drawW) / 2;
            const drawY = THERMAL_4X6_HEIGHT - margin - drawH;

            newPage.drawPage(embeddedPage, {
                x: drawX,
                y: drawY,
                width: drawW,
                height: drawH
            });
        }

        return await newDoc.save();
    }

    async function handleFile(file) {
        reset();
        showLoading('Reading Flipkart PDF file...');
        
        try {
            const arrayBuffer = await file.arrayBuffer();
            const rawPdfBytes = new Uint8Array(arrayBuffer);
            
            showLoading('Analyzing Flipkart label coordinates & SKUs...');
            const parsed = await parseFlipkartPDF(rawPdfBytes.slice(0));
            skuData = parsed.skuMap;
            pageStickerBoxes = parsed.pageBoxes;
            
            renderTable(skuData);
            
            showLoading('Sorting stickers by SKU...');
            
            const pageDetails = parsed.pageDetails.map((item, idx) => ({
                pageIndex: idx,
                skuKey: (item.skus && item.skus.length > 0) ? item.skus[0].sku : `PAGE_${idx}`,
                box: parsed.pageBoxes[idx]
            }));
            
            pageDetails.sort((a, b) => a.skuKey.localeCompare(b.skuKey));
            const sortedPageIndexes = pageDetails.map(p => p.pageIndex);
            pageStickerBoxes = pageDetails.map(p => p.box);
            
            const srcDoc = await PDFLib.PDFDocument.load(rawPdfBytes.slice(0));
            const sortedDoc = await PDFLib.PDFDocument.create();
            const copiedPages = await sortedDoc.copyPages(srcDoc, sortedPageIndexes);
            for (const p of copiedPages) {
                sortedDoc.addPage(p);
            }
            currentPdfBytes = await sortedDoc.save();
            
            showLoading('Cropping & expanding sticker to 4x6 inch thermal roll format...');
            const cropVal = parseInt(flipkartCropHeightSlider.value, 10) || 48;
            croppedPdfBytes = await cropFlipkartTo4x6Thermal(currentPdfBytes.slice(0), cropVal, pageStickerBoxes);
            
            showLoading('Generating 4x6 thermal previews...');
            await renderPreviewsToContainer(croppedPdfBytes.slice(0), flipkartPreviewGrid, 'Flipkart 4x6 Sticker');
            
            flipkartCropHeightSlider.disabled = false;
            downloadBtn.disabled = false;
            flipkartDownloadBtn.disabled = false;
            flipkartPrintBtn.disabled = false;
            if (flipkartGsheetBtn) flipkartGsheetBtn.disabled = false;
            flipkartResetBtn.disabled = false;
            flipkartSearchBar.disabled = false;
            
            const totalLabels = parsed.pageDetails.length;
            showSuccess(`Processed ${totalLabels} Flipkart 4x6 thermal sticker${totalLabels !== 1 ? 's' : ''} and ${Object.keys(skuData).length} unique SKU types!`);
        } catch (err) {
            console.error(err);
            showError('Error: ' + err.message);
        }
    }

    async function parseFlipkartPDF(pdfData) {
        const loadingTask = pdfjsLib.getDocument({ data: pdfData });
        const pdf = await loadingTask.promise;
        const numPages = pdf.numPages;
        
        const skuMap = {};
        const pageDetails = [];
        const pageBoxes = [];
        
        for (let i = 1; i <= numPages; i++) {
            const page = await pdf.getPage(i);
            const textContent = await page.getTextContent();
            const lines = getLinesFromItems(textContent.items);
            const fullText = lines.join('\n');
            const pageView = page.getViewport({ scale: 1.0 });
            const pageH = pageView.height;
            const pageW = pageView.width;
            
            const topHalfItems = textContent.items.filter(it => it.transform[5] > pageH * 0.45 && it.str.trim());
            let minX = pageW * 0.18;
            let maxX = pageW * 0.82;
            let maxY = pageH * 0.98;
            
            if (topHalfItems.length > 0) {
                const xs = topHalfItems.map(it => it.transform[4]).filter(x => x > 20 && x < pageW - 20);
                const ys = topHalfItems.map(it => it.transform[5]).filter(y => y > pageH * 0.45);
                if (xs.length > 0) {
                    minX = Math.min(...xs);
                    maxX = Math.max(...xs.map((x, idx) => x + (topHalfItems[idx].width || 40)));
                }
                if (ys.length > 0) {
                    maxY = Math.max(...ys) + 15;
                }
            }
            
            pageBoxes.push({ minX, maxX, maxY });
            
            let orderId = `OD_PAGE_${i}`;
            const odMatch = fullText.match(/\b(OD\d{16,22})\b/i);
            if (odMatch) {
                orderId = odMatch[1];
            } else {
                const altOdMatch = fullText.match(/Order\s*Id[\s:]*([A-Za-z0-9_-]+)/i);
                if (altOdMatch) orderId = altOdMatch[1].trim();
            }
            
            let customerName = 'Customer';
            const nameMatch = fullText.match(/Name\s*:\s*([^,\n\r]+)/i);
            if (nameMatch && nameMatch[1].trim()) {
                customerName = nameMatch[1].trim();
            } else {
                for (let j = 0; j < lines.length; j++) {
                    const l = lines[j].toLowerCase();
                    if (l.includes('shipping/customer address') || l.includes('shipping address')) {
                        if (j + 1 < lines.length) {
                            customerName = lines[j + 1].replace(/Name\s*:/i, '').trim();
                            break;
                        }
                    }
                }
            }
            
            const pageSkus = [];
            
            for (let j = 0; j < lines.length; j++) {
                const line = lines[j];
                const skuTableMatch = line.match(/^\d+\s+([A-Za-z0-9_.-]+)\s*\|\s*(.+)/);
                if (skuTableMatch) {
                    const extractedSku = skuTableMatch[1].trim();
                    if (extractedSku && !extractedSku.toLowerCase().includes('description')) {
                        pageSkus.push(extractedSku);
                    }
                }
            }
            
            if (pageSkus.length === 0) {
                const invoiceSkuRegex = /([A-Za-z0-9_.-]{4,40})\s*\|\s*([A-Za-z0-9_.-]{4,40})/g;
                let match;
                while ((match = invoiceSkuRegex.exec(fullText)) !== null) {
                    const cand = match[1].trim();
                    if (!cand.toLowerCase().includes('hsn') && !cand.toLowerCase().includes('gst')) {
                        pageSkus.push(cand);
                    }
                }
            }
            
            if (pageSkus.length === 0) {
                const skuMatchGeneric = fullText.match(/(?:SKU\s*ID|SKU)[\s:#|]+([A-Za-z0-9_.-]+)/i);
                if (skuMatchGeneric && skuMatchGeneric[1].trim()) {
                    pageSkus.push(skuMatchGeneric[1].trim());
                }
            }
            
            if (pageSkus.length === 0) {
                pageSkus.push(`Flipkart Item (Order ${orderId})`);
            }
            
            let qty = 1;
            const totalQtyMatch = fullText.match(/TOTAL\s*QTY\s*:\s*(\d+)/i);
            if (totalQtyMatch) {
                qty = parseInt(totalQtyMatch[1], 10) || 1;
            } else {
                const qtyMatch = fullText.match(/(?:QTY|Quantity)[\s:#|]+(\d+)/i);
                if (qtyMatch) qty = parseInt(qtyMatch[1], 10) || 1;
            }
            
            const uniquePageSkus = [...new Set(pageSkus)];
            const recordedSkus = [];
            
            uniquePageSkus.forEach(sku => {
                recordedSkus.push({ sku, qty });
                if (!skuMap[sku]) {
                    skuMap[sku] = { qty: 0, orders: 0, customers: [] };
                }
                skuMap[sku].qty += qty;
                skuMap[sku].orders += 1;
                skuMap[sku].customers.push({ name: customerName, orderId: orderId });
            });
            
            pageDetails.push({
                pageIndex: i - 1,
                skus: recordedSkus,
                customer: customerName,
                orderId: orderId
            });
        }
        
        return { skuMap, pageDetails, pageBoxes };
    }

    function renderTable(data, filterQuery = '') {
        flipkartReportTableBody.innerHTML = '';
        const query = filterQuery.toLowerCase();
        
        let totalQty = 0;
        let totalOrders = 0;
        let skuCount = 0;
        
        const sortedSkus = Object.keys(data).sort();
        
        for (const sku of sortedSkus) {
            if (query && !sku.toLowerCase().includes(query)) continue;
            
            const item = data[sku];
            totalQty += item.qty;
            totalOrders += item.orders;
            skuCount++;
            
            const row = document.createElement('tr');
            row.innerHTML = `
                <td class="sku-cell" data-sku="${sku}">${sku}</td>
                <td class="qty-cell">${item.qty}</td>
                <td>${item.orders}</td>
            `;
            
            row.querySelector('.sku-cell').addEventListener('click', (e) => {
                const selectedSku = e.target.getAttribute('data-sku');
                showCustomerModal(selectedSku, skuData, 'Flipkart Customers for SKU');
            });
            
            flipkartReportTableBody.appendChild(row);
        }
        
        if (skuCount > 0) {
            const totalRow = document.createElement('tr');
            totalRow.className = 'total-row';
            totalRow.innerHTML = `
                <td>TOTAL</td>
                <td class="qty-cell">${totalQty}</td>
                <td>${totalOrders}</td>
            `;
            flipkartReportTableBody.appendChild(totalRow);
        } else {
            flipkartReportTableBody.innerHTML = `
                <tr>
                    <td colspan="3">
                        <div class="empty-state">
                            <div class="empty-state-icon">🔍</div>
                            <div>No Flipkart SKUs match search.</div>
                        </div>
                    </td>
                </tr>
            `;
        }
    }

    function showLoading(text) {
        flipkartStatusBadge.style.display = 'flex';
        flipkartStatusBadge.className = 'status-badge loading';
        flipkartStatusText.textContent = text;
    }

    function showSuccess(text) {
        flipkartStatusBadge.style.display = 'flex';
        flipkartStatusBadge.className = 'status-badge success';
        flipkartStatusText.textContent = text;
    }

    function showError(text) {
        flipkartStatusBadge.style.display = 'flex';
        flipkartStatusBadge.style.background = 'rgba(239, 68, 68, 0.1)';
        flipkartStatusBadge.style.borderColor = 'rgba(239, 68, 68, 0.2)';
        flipkartStatusBadge.style.color = 'var(--danger)';
        flipkartStatusText.textContent = text;
    }

    function reset() {
        currentPdfBytes = null;
        croppedPdfBytes = null;
        skuData = {};
        pageStickerBoxes = [];
        
        flipkartFileInput.value = '';
        flipkartStatusBadge.style.display = 'none';
        flipkartCropHeightSlider.disabled = true;
        flipkartCropHeightSlider.value = 48;
        flipkartHeightVal.textContent = '48%';
        flipkartDownloadBtn.disabled = true;
        flipkartPrintBtn.disabled = true;
        if (flipkartGsheetBtn) flipkartGsheetBtn.disabled = true;
        flipkartResetBtn.disabled = true;
        flipkartSearchBar.disabled = true;
        flipkartSearchBar.value = '';
        
        flipkartReportTableBody.innerHTML = `
            <tr>
                <td colspan="3">
                    <div class="empty-state">
                        <div class="empty-state-icon">🏷️</div>
                        <div>Upload a Flipkart/Shopsy PDF to view SKU dispatch summary</div>
                    </div>
                </td>
            </tr>
        `;
        
        flipkartPreviewGrid.innerHTML = `
            <div class="empty-state" style="grid-column: 1 / -1; width: 100%;">
                <div class="empty-state-icon">👁️</div>
                <div>Flipkart 4x6 thermal sticker previews will appear here</div>
            </div>
        `;
    }

    return { init, reset };
})();


// =========================================================================
// GOOGLE SHEET MODAL & SETUP HANDLERS
// =========================================================================
const gsheetConfigBtn = document.getElementById('gsheetConfigBtn');
const gsheetModal = document.getElementById('gsheetModal');
const closeGsheetModal = document.getElementById('closeGsheetModal');
const gsheetWebhookUrlInput = document.getElementById('gsheetWebhookUrlInput');
const saveGsheetWebhookBtn = document.getElementById('saveGsheetWebhookBtn');
const testGsheetWebhookBtn = document.getElementById('testGsheetWebhookBtn');
const copyScriptBtn = document.getElementById('copyScriptBtn');

function showGsheetModal() {
    if (gsheetModal) {
        if (gsheetWebhookUrlInput) {
            gsheetWebhookUrlInput.value = localStorage.getItem('gsheet_webhook_url') || DEFAULT_WEBHOOK_URL;
        }
        gsheetModal.classList.add('active');
    }
}

function hideGsheetModal() {
    if (gsheetModal) gsheetModal.classList.remove('active');
}

if (gsheetConfigBtn) gsheetConfigBtn.addEventListener('click', showGsheetModal);
if (closeGsheetModal) closeGsheetModal.addEventListener('click', hideGsheetModal);
if (gsheetModal) {
    gsheetModal.addEventListener('click', (e) => {
        if (e.target === gsheetModal) hideGsheetModal();
    });
}

if (saveGsheetWebhookBtn) {
    saveGsheetWebhookBtn.addEventListener('click', () => {
        const url = gsheetWebhookUrlInput.value.trim();
        if (!url) {
            alert('Please paste a valid Google Webhook URL.');
            return;
        }
        localStorage.setItem('gsheet_webhook_url', url);
        alert('✅ Webhook URL saved successfully!');
        hideGsheetModal();
    });
}

if (testGsheetWebhookBtn) {
    testGsheetWebhookBtn.addEventListener('click', async () => {
        const url = gsheetWebhookUrlInput.value.trim() || DEFAULT_WEBHOOK_URL;
        try {
            const now = new Date();
            const dateStr = `${now.getMonth() + 1}/${now.getDate()}/${now.getFullYear()}`;
            const testRow = [dateStr, 'ટેસ્ટ પ્રોડક્ટ', '250 GM', 1, 250, 'Test', 'Automated Test'];
            await fetch(url, {
                method: 'POST',
                mode: 'no-cors',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ rows: [testRow] })
            });
            alert('✅ Test row sent! Check your "Sales Entry Daily" sheet in Google Docs.');
        } catch (e) {
            alert('Error connecting: ' + e.message);
        }
    });
}

// =========================================================================
// PRIVACY & TERMS MODAL HANDLERS
// =========================================================================
const privacyBtn = document.getElementById('privacyBtn');
const privacyModal = document.getElementById('privacyModal');
const closePrivacyModal = document.getElementById('closePrivacyModal');

const termsBtn = document.getElementById('termsBtn');
const termsModal = document.getElementById('termsModal');
const closeTermsModal = document.getElementById('closeTermsModal');

if (privacyBtn && privacyModal && closePrivacyModal) {
    privacyBtn.addEventListener('click', () => privacyModal.classList.add('active'));
    closePrivacyModal.addEventListener('click', () => privacyModal.classList.remove('active'));
    privacyModal.addEventListener('click', (e) => {
        if (e.target === privacyModal) privacyModal.classList.remove('active');
    });
}

if (termsBtn && termsModal && closeTermsModal) {
    termsBtn.addEventListener('click', () => termsModal.classList.add('active'));
    closeTermsModal.addEventListener('click', () => termsModal.classList.remove('active'));
    termsModal.addEventListener('click', (e) => {
        if (e.target === termsModal) termsModal.classList.remove('active');
    });
}

// Initialize all three portals
AmazonPortal.init();
MeeshoPortal.init();
FlipkartPortal.init();