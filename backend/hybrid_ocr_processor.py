import logging
import re
import time
import base64
import json
from pathlib import Path
from typing import Dict, Any, Optional, List
import asyncio
from PIL import Image, ImageEnhance, ImageFilter
import pytesseract
import fitz  # PyMuPDF for PDF processing
import cv2
import numpy as np
from groq import Groq
import httpx
from config import settings

# Configure Tesseract path
pytesseract.pytesseract.tesseract_cmd = settings.TESSERACT_CMD

logger = logging.getLogger(__name__)

class HybridOCRProcessor:
    """
    Enhanced Hybrid OCR processor with improved image preprocessing for PNG/JPG files
    """
    
    def __init__(self):
        self.supported_formats = ['.pdf', '.png', '.jpg', '.jpeg']
        # Initialize Groq client
        self.groq_client = None
        try:
            self.groq_client = Groq()
            logger.info("Groq client initialized successfully")
        except Exception as e:
            logger.warning(f"Groq client initialization failed: {e}")
        
        # Enhanced regex patterns
        self.email_pattern = re.compile(r'\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b')
        self.phone_patterns = [
            re.compile(r'\+?1?[-.\s]?\(?([0-9]{3})\)?[-.\s]?([0-9]{3})[-.\s]?([0-9]{4})'),  # US format
            re.compile(r'\+?91[-.\s]?([6-9]\d{9})'),  # Indian mobile with country code
            re.compile(r'\b([6-9]\d{9})\b'),  # Indian mobile without country code
            re.compile(r'\+?[0-9]{1,4}[-.\s]?[0-9]{3,4}[-.\s]?[0-9]{3,4}[-.\s]?[0-9]{3,4}'),  # International
            re.compile(r'\(?[0-9]{3}\)?[-.\s]?[0-9]{3}[-.\s]?[0-9]{4}')  # Standard US
        ]

    async def health_check(self) -> str:
        """Check if OCR processor is working"""
        try:
            # Test tesseract
            version = pytesseract.get_tesseract_version()
            groq_status = "available" if self.groq_client else "unavailable"
            return f"Tesseract {version} ready, Groq {groq_status}"
        except Exception as e:
            logger.error(f"OCR health check failed: {e}")
            return f"OCR unavailable: {str(e)}"
    
    async def process_document_enhanced(self, file_path: Path) -> Dict[str, Any]:
        """
        Enhanced document processing with improved OCR for PNG/JPG files
        """
        start_time = time.time()
        
        try:
            logger.info("=== ENHANCED DOCUMENT PROCESSING STARTED ===")
            logger.info(f"Processing file: {file_path}")
            
            # Step 1: Enhanced OCR extraction
            logger.info("Step 1: Enhanced OCR extraction...")
            raw_text = await self._extract_with_enhanced_tesseract(file_path)
            logger.info(f"OCR extracted {len(raw_text)} characters")
            
            # Step 2: Generate document preview
            document_preview = await self._generate_preview(file_path)
            
            # Step 3: Enhanced AI extraction with Groq
            if self.groq_client and raw_text.strip():
                logger.info("Step 2: Enhanced Groq AI processing...")
                extracted_info = await self._extract_with_enhanced_groq_ai(raw_text)
                methods_used = ["Enhanced Tesseract OCR", "Groq AI with Context"]
            else:
                logger.info("Step 2: Enhanced regex extraction...")
                extracted_info = await self._extract_lead_info_enhanced(raw_text)
                methods_used = ["Enhanced Tesseract OCR", "Enhanced Regex Extraction"]
            
            processing_time = time.time() - start_time
            
            result = {
                "success": True,
                "extracted_data": {
                    "name": extracted_info.get("name", ""),
                    "email": extracted_info.get("email", ""),
                    "phone": extracted_info.get("phone", "N/A"),
                    "confidence_score": extracted_info.get("confidence", 0.0)
                },
                "document_preview": document_preview,
                "processing_metadata": {
                    "document_type": self._detect_document_type(raw_text),
                    "processing_time": round(processing_time, 2),
                    "methods_used": methods_used,
                    "text_length": len(raw_text),
                    "file_type": file_path.suffix.lower()
                },
                "confidence_score": extracted_info.get("confidence", 0.0),
                "raw_text": raw_text[:1000],  # Include first 1000 chars for debugging
                "message": "Document processed successfully with enhanced OCR"
            }
            
            logger.info(f"Enhanced processing completed in {processing_time:.2f}s")
            logger.info(f"Final confidence score: {result['confidence_score']}")
            return result
            
        except Exception as e:
            logger.error(f"Enhanced document processing failed: {str(e)}")
            
            # Return error with document preview if possible
            try:
                document_preview = await self._generate_preview(file_path)
            except:
                document_preview = None
                
            return {
                "success": False,
                "extracted_data": {"name": "", "email": "", "phone": "N/A", "confidence_score": 0.0},
                "document_preview": document_preview,
                "processing_metadata": {"document_type": "unknown", "processing_time": 0, "methods_used": ["Failed"]},
                "confidence_score": 0.0,
                "message": f"Processing failed: {str(e)}"
            }
    
    async def _extract_with_enhanced_tesseract(self, file_path: Path) -> str:
        """Enhanced OCR extraction with better preprocessing"""
        file_extension = file_path.suffix.lower()
        
        if file_extension == '.pdf':
            return await self._extract_text_from_pdf_enhanced(file_path)
        elif file_extension in ['.png', '.jpg', '.jpeg']:
            return await self._extract_text_from_image_enhanced(file_path)
        else:
            raise ValueError(f"Unsupported file format: {file_extension}")
    
    async def _extract_text_from_image_enhanced(self, file_path: Path) -> str:
        """
        Enhanced image OCR with multiple preprocessing techniques and OCR attempts
        """
        try:
            logger.info("=== ENHANCED IMAGE OCR STARTED ===")
            
            # Load original image
            original_image = cv2.imread(str(file_path))
            if original_image is None:
                raise Exception("Could not load image file")
            
            logger.info(f"Original image shape: {original_image.shape}")
            
            # Convert to PIL for initial preprocessing
            pil_image = Image.open(file_path)
            
            # Apply multiple preprocessing techniques
            processed_images = []
            
            # Technique 1: Basic preprocessing
            basic_processed = self._basic_image_preprocessing(original_image)
            processed_images.append(("Basic", basic_processed))
            
            # Technique 2: Enhanced contrast and sharpening
            enhanced_processed = self._enhanced_image_preprocessing(pil_image)
            processed_images.append(("Enhanced", enhanced_processed))
            
            # Technique 3: Document-specific preprocessing
            doc_processed = self._document_specific_preprocessing(original_image)
            processed_images.append(("Document", doc_processed))
            
            # Technique 4: Small text optimization
            small_text_processed = self._small_text_preprocessing(original_image)
            processed_images.append(("SmallText", small_text_processed))
            
            # Try OCR with multiple configurations
            ocr_results = []
            
            for technique_name, processed_img in processed_images:
                logger.info(f"Trying OCR with {technique_name} preprocessing...")
                
                # Multiple OCR configurations
                configs = [
                    r'--oem 3 --psm 6 -l eng',  # Standard
                    r'--oem 3 --psm 8 -l eng',  # Single word
                    r'--oem 3 --psm 7 -l eng',  # Single text line
                    r'--oem 3 --psm 4 -l eng',  # Single column
                    r'--oem 3 --psm 11 -l eng', # Sparse text
                    r'--oem 3 --psm 13 -l eng', # Raw line
                ]
                
                for config in configs:
                    try:
                        # Convert to PIL Image if needed
                        if isinstance(processed_img, np.ndarray):
                            pil_processed = Image.fromarray(processed_img)
                        else:
                            pil_processed = processed_img
                        
                        # Perform OCR
                        text = pytesseract.image_to_string(pil_processed, config=config)
                        
                        # Get confidence
                        data = pytesseract.image_to_data(pil_processed, config=config, output_type=pytesseract.Output.DICT)
                        confidences = [int(conf) for conf in data['conf'] if int(conf) > 0]
                        avg_confidence = sum(confidences) / len(confidences) if confidences else 0
                        
                        if text.strip() and avg_confidence > 30:  # Minimum confidence threshold
                            ocr_results.append({
                                'text': text.strip(),
                                'confidence': avg_confidence,
                                'technique': technique_name,
                                'config': config
                            })
                            logger.info(f"{technique_name} + {config}: {avg_confidence:.1f}% confidence, {len(text)} chars")
                        
                    except Exception as e:
                        logger.warning(f"OCR failed for {technique_name} + {config}: {e}")
                        continue
            
            # Select best result
            if ocr_results:
                # Sort by confidence and text length
                ocr_results.sort(key=lambda x: (x['confidence'], len(x['text'])), reverse=True)
                best_result = ocr_results[0]
                
                logger.info(f"Best OCR result: {best_result['technique']} technique")
                logger.info(f"Confidence: {best_result['confidence']:.2f}%")
                logger.info(f"Text length: {len(best_result['text'])} characters")
                
                return best_result['text']
            else:
                logger.warning("No good OCR results found, trying fallback...")
                # Fallback to simple OCR
                fallback_text = pytesseract.image_to_string(pil_image, config=r'--oem 3 --psm 6')
                return fallback_text.strip()
            
        except Exception as e:
            logger.error(f"Enhanced image OCR failed: {str(e)}")
            raise Exception(f"Failed to process image: {str(e)}")
    
    def _basic_image_preprocessing(self, image: np.ndarray) -> np.ndarray:
        """Basic image preprocessing"""
        # Convert to grayscale
        if len(image.shape) == 3:
            gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
        else:
            gray = image
        
        # Noise reduction
        denoised = cv2.medianBlur(gray, 3)
        
        # Adaptive threshold
        thresh = cv2.adaptiveThreshold(
            denoised, 255, cv2.ADAPTIVE_THRESH_GAUSSIAN_C, cv2.THRESH_BINARY, 11, 2
        )
        
        return thresh
    
    def _enhanced_image_preprocessing(self, pil_image: Image.Image) -> Image.Image:
        """Enhanced preprocessing with PIL"""
        # Convert to grayscale
        if pil_image.mode != 'L':
            gray_img = pil_image.convert('L')
        else:
            gray_img = pil_image
        
        # Enhance contrast
        enhancer = ImageEnhance.Contrast(gray_img)
        contrast_img = enhancer.enhance(2.0)
        
        # Enhance sharpness
        sharpness_enhancer = ImageEnhance.Sharpness(contrast_img)
        sharp_img = sharpness_enhancer.enhance(2.0)
        
        # Apply unsharp mask filter
        unsharp_img = sharp_img.filter(ImageFilter.UnsharpMask(radius=2, percent=150, threshold=3))
        
        return unsharp_img
    
    def _document_specific_preprocessing(self, image: np.ndarray) -> np.ndarray:
        """Document-specific preprocessing"""
        # Convert to grayscale
        if len(image.shape) == 3:
            gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
        else:
            gray = image
        
        # Apply CLAHE (Contrast Limited Adaptive Histogram Equalization)
        clahe = cv2.createCLAHE(clipLimit=3.0, tileGridSize=(8,8))
        clahe_img = clahe.apply(gray)
        
        # Gaussian blur to reduce noise
        blurred = cv2.GaussianBlur(clahe_img, (3, 3), 0)
        
        # Otsu's threshold
        _, thresh = cv2.threshold(blurred, 0, 255, cv2.THRESH_BINARY + cv2.THRESH_OTSU)
        
        # Morphological operations
        kernel = np.ones((1,1), np.uint8)
        opened = cv2.morphologyEx(thresh, cv2.MORPH_OPEN, kernel)
        closed = cv2.morphologyEx(opened, cv2.MORPH_CLOSE, kernel)
        
        return closed
    
    def _small_text_preprocessing(self, image: np.ndarray) -> np.ndarray:
        """Preprocessing optimized for small text"""
        # Convert to grayscale
        if len(image.shape) == 3:
            gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
        else:
            gray = image
        
        # Scale up the image for better OCR (2x)
        height, width = gray.shape
        scaled = cv2.resize(gray, (width * 2, height * 2), interpolation=cv2.INTER_CUBIC)
        
        # Enhanced denoising
        denoised = cv2.bilateralFilter(scaled, 9, 75, 75)
        
        # Sharpen the image
        kernel = np.array([[-1,-1,-1], [-1,9,-1], [-1,-1,-1]])
        sharpened = cv2.filter2D(denoised, -1, kernel)
        
        # Adaptive threshold with different parameters for small text
        thresh = cv2.adaptiveThreshold(
            sharpened, 255, cv2.ADAPTIVE_THRESH_MEAN_C, cv2.THRESH_BINARY, 15, 8
        )
        
        # Slight dilation to make text thicker
        kernel = np.ones((1,1), np.uint8)
        dilated = cv2.dilate(thresh, kernel, iterations=1)
        
        return dilated
    
    async def _extract_text_from_pdf_enhanced(self, file_path: Path) -> str:
        """Enhanced PDF text extraction"""
        try:
            doc = fitz.open(file_path)
            text = ""
            
            for page_num in range(min(3, len(doc))):  # Process max 3 pages
                page = doc.load_page(page_num)
                page_text = page.get_text()
                
                # If PDF has no text, try OCR on images with enhanced processing
                if not page_text.strip():
                    pix = page.get_pixmap(matrix=fitz.Matrix(3, 3))  # Higher resolution (3x)
                    img_data = pix.tobytes("png")
                    
                    # Convert to PIL Image for enhanced OCR
                    import io
                    image = Image.open(io.BytesIO(img_data))
                    
                    # Apply enhanced preprocessing
                    image_array = np.array(image)
                    if len(image_array.shape) == 3:
                        image_array = cv2.cvtColor(image_array, cv2.COLOR_RGB2BGR)
                    
                    # Use the enhanced image preprocessing
                    processed = self._document_specific_preprocessing(image_array)
                    
                    # Multiple OCR attempts
                    configs = [
                        r'--oem 3 --psm 6 -l eng',
                        r'--oem 3 --psm 4 -l eng',
                        r'--oem 3 --psm 11 -l eng'
                    ]
                    
                    best_text = ""
                    best_confidence = 0
                    
                    for config in configs:
                        try:
                            ocr_text = pytesseract.image_to_string(Image.fromarray(processed), config=config)
                            data = pytesseract.image_to_data(Image.fromarray(processed), config=config, output_type=pytesseract.Output.DICT)
                            confidences = [int(conf) for conf in data['conf'] if int(conf) > 0]
                            avg_confidence = sum(confidences) / len(confidences) if confidences else 0
                            
                            if avg_confidence > best_confidence and len(ocr_text.strip()) > len(best_text.strip()):
                                best_text = ocr_text
                                best_confidence = avg_confidence
                        except:
                            continue
                    
                    text += best_text
                else:
                    text += page_text
                
                text += "\n"
            
            doc.close()
            return text.strip()
            
        except Exception as e:
            logger.error(f"Enhanced PDF text extraction failed: {str(e)}")
            raise Exception(f"Failed to process PDF: {str(e)}")

    async def _extract_with_enhanced_groq_ai(self, text: str) -> Dict[str, Any]:
        """Enhanced Groq AI extraction with better context and prompting"""
        try:
            # Enhanced prompt with better instructions
            prompt = f"""You are an expert data extraction assistant specialized in extracting contact information from OCR text. The text may contain OCR errors, so use context clues and pattern recognition.

OCR Text (may contain errors):
{text}

EXTRACTION RULES:
1. NAME EXTRACTION:
   - Look for proper names (capitalized words that aren't companies)
   - Prioritize names near the beginning of the document
   - Exclude titles (Mr, Dr, CEO, Manager, Director, etc.)
   - Exclude company names
   - If multiple names, choose the primary contact person

2. EMAIL EXTRACTION:
   - Find valid email addresses (name@domain.com format)
   - Ignore system emails (noreply, support, info)
   - Correct common OCR errors (0→o, 1→l, etc.)

3. PHONE EXTRACTION:
   - Look for phone numbers in any format
   - Include country codes if present
   - Handle Indian numbers (+91 prefix or 10-digit starting with 6-9)
   - Handle US numbers (10-digit or with +1)

4. CONFIDENCE SCORING:
   - High (0.8-1.0): Clear, unambiguous information
   - Medium (0.5-0.8): Some OCR errors but likely correct
   - Low (0.2-0.5): Heavily corrupted or unclear text
   - Very Low (0.0-0.2): No clear information found

IMPORTANT: Return ONLY valid JSON in this exact format:
{{
  "name": "Full Name Here",
  "email": "email@domain.com", 
  "phone": "+91-99999-99999",
  "confidence": 0.85,
  "extraction_notes": "Brief note about extraction quality"
}}

EXAMPLES:
- "John Smith\\nCEO\\njohn@company.com" → name: "John Smith"
- "Dr. Sarah Wilson\\nsarah.wilson@email.com" → name: "Sarah Wilson"  
- "VISHWA TEJA\\nvishwateja.thouti_2026@woxsen.edu.in" → name: "Vishwa Teja"

Extract the information now:"""

            completion = self.groq_client.chat.completions.create(
                messages=[
                    {
                        "role": "system", 
                        "content": "You are a precise data extraction expert. Always return valid JSON with accurate contact information."
                    },
                    {"role": "user", "content": prompt}
                ],
                model="llama-3.1-70b-versatile",  # Use the more powerful model
                temperature=0.1,
                max_tokens=800
            )
            
            response_text = completion.choices[0].message.content.strip()
            logger.info(f"Enhanced Groq AI response: {response_text}")
            
            # Parse JSON response
            try:
                # Clean the response to extract JSON
                if "```json" in response_text:
                    json_start = response_text.find("```json") + 7
                    json_end = response_text.find("```", json_start)
                    response_text = response_text[json_start:json_end].strip()
                elif "{" in response_text:
                    json_start = response_text.find("{")
                    json_end = response_text.rfind("}") + 1
                    response_text = response_text[json_start:json_end]
                
                result = json.loads(response_text)
                
                # Validate and clean the result
                return {
                    "name": self._clean_name(result.get("name", "")),
                    "email": self._clean_email(result.get("email", "")),
                    "phone": self._clean_phone(result.get("phone", "N/A")),
                    "confidence": min(max(result.get("confidence", 0.5), 0.0), 1.0)
                }
                
            except json.JSONDecodeError as e:
                logger.warning(f"Failed to parse enhanced Groq AI JSON response: {e}")
                return await self._extract_lead_info_enhanced(text)
                
        except Exception as e:
            logger.error(f"Enhanced Groq AI extraction failed: {e}")
            return await self._extract_lead_info_enhanced(text)
    
    def _clean_name(self, name: str) -> str:
        """Clean and validate extracted name"""
        if not name:
            return ""
        
        # Remove common prefixes and suffixes
        name = re.sub(r'\b(Mr|Mrs|Ms|Dr|Prof|CEO|CTO|Manager|Director|Sir|Madam)\.?\s*', '', name, flags=re.IGNORECASE)
        
        # Clean up whitespace and capitalize properly
        name = re.sub(r'\s+', ' ', name.strip())
        
        # Return if it looks like a valid name (2-4 words, each 2+ chars)
        words = name.split()
        if 2 <= len(words) <= 4 and all(len(word) >= 2 and word.isalpha() for word in words):
            return ' '.join(word.capitalize() for word in words)
        
        return ""
    
    def _clean_email(self, email: str) -> str:
        """Clean and validate extracted email"""
        if not email:
            return ""
        
        # Basic email validation
        if self.email_pattern.match(email):
            return email.lower()
        
        return ""
    
    def _clean_phone(self, phone: str) -> str:
        """Clean and format extracted phone number"""
        if not phone or phone == "N/A":
            return "N/A"
        
        # Remove all non-digit characters for processing
        digits = re.sub(r'[^\d]', '', phone)
        
        # Format based on length and pattern
        if len(digits) == 10 and digits[0] in '6789':
            # Indian mobile number
            return f"+91 {digits[:5]}-{digits[5:]}"
        elif len(digits) == 12 and digits.startswith('91'):
            # Indian mobile with country code
            return f"+91 {digits[2:7]}-{digits[7:]}"
        elif len(digits) == 10:
            # US number
            return f"({digits[:3]}) {digits[3:6]}-{digits[6:]}"
        elif len(digits) == 11 and digits[0] == '1':
            # US number with country code
            return f"+1 ({digits[1:4]}) {digits[4:7]}-{digits[7:]}"
        
        # Return original if no pattern matches
        return phone

    async def _generate_preview(self, file_path: Path) -> Optional[str]:
        """Generate base64 encoded preview of the document"""
        try:
            file_extension = file_path.suffix.lower()
            
            if file_extension == '.pdf':
                # Convert first page of PDF to image
                doc = fitz.open(file_path)
                page = doc.load_page(0)
                pix = page.get_pixmap(matrix=fitz.Matrix(2, 2))  # 2x zoom for better quality
                img_data = pix.tobytes("png")
                doc.close()
                
                # Convert to base64
                return base64.b64encode(img_data).decode('utf-8')
                
            elif file_extension in ['.png', '.jpg', '.jpeg']:
                # Read image and convert to base64
                with open(file_path, 'rb') as img_file:
                    img_data = img_file.read()
                    return base64.b64encode(img_data).decode('utf-8')
                    
        except Exception as e:
            logger.error(f"Preview generation failed: {str(e)}")
            return None
    
    def _detect_document_type(self, text: str) -> str:
        """Detect document type based on content"""
        text_lower = text.lower()
        
        if any(keyword in text_lower for keyword in ['resume', 'cv', 'curriculum', 'experience', 'education', 'skills']):
            return 'resume'
        elif any(keyword in text_lower for keyword in ['business card', 'card', 'company', 'title', 'position']):
            return 'business_card'
        elif any(keyword in text_lower for keyword in ['aadhaar', 'unique identification', 'government of india']):
            return 'id_document'
        elif any(keyword in text_lower for keyword in ['form', 'application', 'survey']):
            return 'form'
        elif '@' in text and any(pattern.search(text) for pattern in self.phone_patterns):
            return 'contact_info'
        else:
            return 'document'
    
    async def _extract_lead_info_enhanced(self, text: str) -> Dict[str, Any]:
        """Enhanced fallback extraction using regex patterns"""
        extracted = {
            "name": "",
            "email": "",
            "phone": "",
            "confidence": 0.0
        }
        
        confidence_factors = []
        
        # Enhanced email extraction
        email_matches = self.email_pattern.findall(text)
        if email_matches:
            valid_emails = [email for email in email_matches 
                          if not any(invalid in email.lower() for invalid in ['noreply', 'donotreply', 'example.com', 'test.com'])]
            if valid_emails:
                extracted["email"] = valid_emails[0].lower()
                confidence_factors.append(0.4)
        
        # Enhanced phone extraction
        for pattern in self.phone_patterns:
            phone_matches = pattern.findall(text)
            if phone_matches:
                phone = phone_matches[0]
                if isinstance(phone, tuple):
                    phone = phone[0]
                
                # Clean and format
                phone = re.sub(r'[^\d]', '', phone)
                
                if len(phone) == 10 and phone[0] in '6789':
                    phone = f"+91 {phone[:5]}-{phone[5:]}"
                elif len(phone) == 12 and phone.startswith('91'):
                    phone = f"+91 {phone[2:7]}-{phone[7:]}"
                elif len(phone) == 10:
                    phone = f"({phone[:3]}) {phone[3:6]}-{phone[6:]}"
                
                extracted["phone"] = phone
                confidence_factors.append(0.3)
                break
        
        # Enhanced name extraction
        name_candidates = []
        lines = text.split('\n')
        
        for i, line in enumerate(lines[:10]):
            line = line.strip()
            if 3 < len(line) < 60:
                cleaned_line = re.sub(r'[^\w\s]', ' ', line)
                words = cleaned_line.split()
                
                if 2 <= len(words) <= 4 and all(len(word) > 1 and word.isalpha() for word in words):
                    skip_words = ['government', 'india', 'unique', 'identification', 'authority', 'aadhaar', 'card', 'date', 'birth', 'address', 'male', 'female', 'company', 'ltd', 'inc']
                    if not any(skip_word in line.lower() for skip_word in skip_words):
                        score = 1.0 - (i * 0.05)
                        name_candidates.append((line, score))
        
        if name_candidates:
            name_candidates.sort(key=lambda x: x[1], reverse=True)
            extracted["name"] = name_candidates[0][0]
            confidence_factors.append(0.3 * name_candidates[0][1])
        
        # Calculate confidence
        if confidence_factors:
            extracted["confidence"] = min(sum(confidence_factors), 1.0)
        
        fields_found = sum(1 for field in ['name', 'email', 'phone'] if extracted[field])
        if fields_found >= 2:
            extracted["confidence"] = min(extracted["confidence"] * 1.2, 1.0)
        
        return extracted
