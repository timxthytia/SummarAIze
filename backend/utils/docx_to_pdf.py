import os
import subprocess
import uuid

def convert_docx_to_pdf(docx_path: str, output_dir: str) -> str:
    """
    Convert a DOCX file to PDF using LibreOffice CLI.

    Args:
        docx_path (str): Path to the DOCX file.
        output_dir (str): Directory where PDF should be saved.

    Returns:
        str: Path to the converted PDF file.

    Raises:
        RuntimeError: If conversion fails.
    """
    print(f"[DEBUG] Starting DOCX to PDF conversion for: {docx_path}")
    if not os.path.exists(docx_path):
        raise FileNotFoundError(f"DOCX file not found: {docx_path}")

    os.makedirs(output_dir, exist_ok=True)

    try:
        print(f"[DEBUG] Running LibreOffice command...")
        subprocess.run([
            "libreoffice",
            "--headless",
            "--convert-to", "pdf",
            docx_path,
            "--outdir", output_dir
        ], check=True)
    except subprocess.CalledProcessError as e:
        print(f"[ERROR] LibreOffice conversion failed. Error: {e}")
        raise RuntimeError(f"LibreOffice conversion failed. Error: {e}")
    except Exception as e:
        print(f"[ERROR] Unexpected error during DOCX to PDF conversion: {e}")
        raise RuntimeError(f"Unexpected error during DOCX to PDF conversion: {e}")

    # Construct PDF path
    base_name = os.path.splitext(os.path.basename(docx_path))[0]
    pdf_path = os.path.join(output_dir, base_name + ".pdf")

    if not os.path.exists(pdf_path):
        raise RuntimeError(f"PDF file not created: {pdf_path}")

    print(f"[DEBUG] PDF successfully created at: {pdf_path}")
    return pdf_path