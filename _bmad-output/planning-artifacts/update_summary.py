import sys
import os

# Change working directory to the scripts folder to handle internal relative imports correctly
os.chdir(r'C:\Users\Ahmed\.agents\skills\docx\scripts')
sys.path.append(r'C:\Users\Ahmed\.agents\skills\docx\scripts')
sys.path.append(r'C:\Users\Ahmed\.agents\skills\docx')
from document import Document

def update_summary():
    doc_path = r'D:\AI\Freelance\Afia-App\_bmad-output\planning-artifacts\unpacked-summary'
    doc = Document(doc_path)
    
    # Use the suggested RSID for tracked changes
    rsid = "61BEE772"
    author = "Ahmed"
    date = "2026-03-01T14:30:00Z"

    # Find the paragraph containing the specific text
    target_text = "AI estimates fill %; precise volume calculated from known bottle geometry"
    new_text = "The 'Ruler vs. Guesser' Approach: AI acts as a digital ruler to find fill percentage, while the bottle registry anchors results to 100% precise physics and geometry."

    # Search for the paragraph
    for p in doc.paragraphs:
        if target_text in p.text:
            # We found the paragraph. Now let's implement tracked changes.
            # We want to delete the old text and insert the new text.
            # Minimal edit principle: replace the whole text in this case as it's a complete description.
            
            p.add_deletion(target_text, author=author, date=date, rsid=rsid)
            p.add_insertion(new_text, author=author, date=date, rsid=rsid)
            break

    doc.save()
    print("Successfully applied tracked changes to the client summary.")

if __name__ == "__main__":
    update_summary()
