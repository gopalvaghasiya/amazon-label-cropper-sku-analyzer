# E-Commerce Shipping Label Cropper & SKU Picklist Hub (Amazon, Meesho & Flipkart)

🔗 **Live Tool**: [https://gopalvaghasiya.github.io/amazon-label-cropper-sku-analyzer/](https://gopalvaghasiya.github.io/amazon-label-cropper-sku-analyzer/)

A secure, high-performance, and **100% client-side web tool** designed for **Amazon, Meesho & Flipkart/Shopsy Sellers** to streamline their packaging, shipping, and dispatch workflows through a single unified URL.

No need to open multiple websites or tools—switch seamlessly between **Amazon Portal**, **Meesho Portal**, and **Flipkart Portal** tabs, crop thermal shipping labels, filter tax invoices, generate SKU-wise dispatch picklists, and launch seller panels with 1 click.

---

## 🚀 Key Features

### 📦 Amazon Portal
* **Direct Thermal Printing**: Print clean Amazon shipping label stickers directly to your thermal printer with 1 click without downloading files.
* **Invoice Auto-Exclusion**: Automatically identifies and filters out Tax Invoice pages, leaving only clean shipping labels in the final PDF.
* **SKU-wise Summary Report**: Parses invoice sheets to extract Amazon ASINs/Seller SKUs (e.g. `SD-MIX-1000`) and order quantities (`Qty`) for dispatch.
* **Customer List Breakdown**: Click any SKU name to open a popup with customer names and Amazon Order IDs.

### 🛍️ Meesho Portal
* **Meesho Label Processing**: Upload Meesho shipping label PDFs to automatically parse Sub-Order IDs, Product SKUs, Quantities, and Customer details.
* **SKU Sort & Picklist**: Sorts Meesho labels alphabetically by SKU and compiles picklists for fast packing.
* **Thermal Label Margin Cropper**: Adjust label cutoff height slider to fit 4x6 inch thermal roll formats.
* **1-Click Thermal Print & PDF Download**: Send Meesho stickers straight to thermal printers (Zebra, Xprinter, TSC, etc.).

### 🏷️ Flipkart & Shopsy Portal
* **Automatic Invoice Cropper**: Automatically crops the top shipping label sticker from Flipkart/Shopsy A4 PDF sheets (default 48% height) and removes the bottom Tax Invoice half.
* **SKU Extraction**: Extracts Flipkart Seller SKU ID (e.g. `SD-SANDALWOOD-250`), Description, and Total Qty.
* **Order & Customer Breakdown**: Captures Flipkart Order IDs (`OD...`) and Customer names for the dispatch report.
* **Thermal Print & Download**: Ready for standard 4x6 thermal barcode stickers.

### 📑 All-in-One Multi-Portal Hub
* **Tab-Wise Navigation**: Switch between Amazon, Meesho, and Flipkart workspaces on one URL with URL hash routing (`#amazon`, `#meesho`, `#flipkart`).
* **Quick Seller Panel Launch**: Direct 1-click launch links for **Amazon Seller Central**, **Meesho Supplier Panel**, and **Flipkart Seller Hub**.
* **100% Client-Side (Zero Server Uploads)**: All PDF parsing, text extraction, and cropping run entirely within your local browser. Customer and invoice data stay 100% private.

---

## 🛠️ Technology Stack

* **Frontend**: Vanilla HTML5, CSS3, ES6 JavaScript
* **Theme**: Glassmorphism dark-theme styled with **Outfit** and **Plus Jakarta Sans** typography
* **PDF Engine**:
  * [pdf-lib](https://github.com/Hopding/pdf-lib) (For page extraction and label cropping)
  * [pdf.js](https://mozilla.github.io/pdf.js/) (For in-browser PDF rendering and text parsing)

---

## 📦 Deployment to GitHub Pages

Since this application runs entirely in the browser and requires no server-side backend (no Node.js, PHP, or Python), it is perfectly suited for **GitHub Pages**.

1. **Initialize Git**:
   ```bash
   git add .
   git commit -m "Add Flipkart portal tab and invoice cropper"
   ```
2. **Push to Remote**:
   ```bash
   git push origin main
   ```
3. Your site will be live at `https://gopalvaghasiya.github.io/amazon-label-cropper-sku-analyzer/`!

---

## 💻 Running Locally

Open `index.html` directly in your web browser or serve it through your local XAMPP/Apache server (`http://localhost/Amzone_SKUwise_Report_And_Crop/`).

---

## 🛡️ License

Distributed under the MIT License. See `LICENSE` for more information.