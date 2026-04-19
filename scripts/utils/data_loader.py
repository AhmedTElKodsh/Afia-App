"""
Data Loader for Training Samples
Handles Supabase queries and image downloading from R2
"""

import logging
from typing import List, Dict, Tuple
import numpy as np
from PIL import Image
import requests
from io import BytesIO
from supabase import create_client, Client

logger = logging.getLogger(__name__)

class TrainingDataLoader:
    """Loads training samples from Supabase and downloads images"""
    
    def __init__(self, supabase_url: str, supabase_key: str):
        """Initialize Supabase client"""
        self.client: Client = create_client(supabase_url, supabase_key)
        logger.info("✓ Supabase client initialized")
    
    def get_training_samples(self, min_samples: int = 500) -> List[Dict]:
        """
        Query training samples from Supabase
        
        Args:
            min_samples: Minimum required samples
            
        Returns:
            List of training sample dictionaries
            
        Raises:
            ValueError: If insufficient samples available
        """
        logger.info("Querying training samples from Supabase...")
        
        # Query training_samples table
        response = self.client.table('training_samples').select('*').execute()
        
        samples = response.data
        logger.info(f"Found {len(samples)} training samples")
        
        if len(samples) < min_samples:
            raise ValueError(
                f"Insufficient training samples: {len(samples)} < {min_samples} required"
            )
        
        # Log distribution by split
        splits = {}
        for sample in samples:
            split = sample.get('metadata', {}).get('split', 'unknown')
            splits[split] = splits.get(split, 0) + 1
        
        logger.info(f"Split distribution: {splits}")
        
        return samples
    
    def download_image(self, image_url: str, target_size: Tuple[int, int] = (224, 224), max_retries: int = 3) -> np.ndarray:
        """
        Download and preprocess image with retry logic
        
        Args:
            image_url: URL to image in R2/B2
            target_size: Target image size (width, height)
            max_retries: Maximum number of retry attempts
            
        Returns:
            Preprocessed image as numpy array (normalized 0-1)
        """
        import time
        
        for attempt in range(max_retries):
            try:
                # Download image
                response = requests.get(image_url, timeout=10)
                response.raise_for_status()
                
                # Load and validate
                img = Image.open(BytesIO(response.content))
                
                # Validate image quality
                if img.size[0] < 100 or img.size[1] < 100:
                    raise ValueError(f"Image too small: {img.size}")
                
                if img.mode not in ['RGB', 'RGBA', 'L']:
                    raise ValueError(f"Unsupported image mode: {img.mode}")
                
                # Convert to RGB and resize
                img = img.convert('RGB')
                img = img.resize(target_size, Image.Resampling.LANCZOS)
                
                # Convert to numpy array and normalize
                img_array = np.array(img, dtype=np.float32) / 255.0
                
                return img_array
                
            except Exception as e:
                if attempt == max_retries - 1:
                    logger.error(f"Failed after {max_retries} attempts: {image_url}: {e}")
                    raise
                logger.warning(f"Retry {attempt + 1}/{max_retries} for {image_url}: {e}")
                time.sleep(2 ** attempt)  # Exponential backoff
    
    def prepare_dataset(
        self,
        samples: List[Dict],
        split: str,
        target_size: Tuple[int, int] = (224, 224)
    ) -> Tuple[np.ndarray, np.ndarray]:
        """
        Prepare dataset for a specific split
        
        Args:
            samples: List of training samples
            split: 'train', 'val', or 'test'
            target_size: Image size
            
        Returns:
            Tuple of (images, labels) as numpy arrays
        """
        logger.info(f"Preparing {split} dataset...")
        
        # Filter samples by split
        split_samples = [
            s for s in samples 
            if s.get('metadata', {}).get('split') == split
        ]
        
        if not split_samples:
            raise ValueError(f"No samples found for split: {split}")
        
        logger.info(f"Loading {len(split_samples)} {split} samples...")
        
        images = []
        labels = []
        
        for i, sample in enumerate(split_samples):
            try:
                # Download and preprocess image
                img = self.download_image(sample['image_url'], target_size)
                images.append(img)
                
                # Extract label (fill percentage as 0-1)
                label = float(sample['label_percentage']) / 100.0
                labels.append(label)
                
                if (i + 1) % 50 == 0:
                    logger.info(f"  Loaded {i + 1}/{len(split_samples)} images...")
                    
            except Exception as e:
                logger.warning(f"Skipping sample {sample.get('id')}: {e}")
                continue
        
        images_array = np.array(images, dtype=np.float32)
        labels_array = np.array(labels, dtype=np.float32)
        
        logger.info(f"✓ {split} dataset ready: {images_array.shape}, labels: {labels_array.shape}")
        
        return images_array, labels_array
