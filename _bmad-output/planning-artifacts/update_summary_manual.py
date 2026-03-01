import os
import re

def update_xml_manually():
    xml_path = r'D:\AI\Freelance\Afia-App\_bmad-output\planning-artifacts\unpacked-summary\word\document.xml'
    with open(xml_path, 'r', encoding='utf-8') as f:
        content = f.read()

    # The target text we found earlier:
    # <w:t xml:space="preserve">AI estimates fill %; precise volume calculated from known bottle geometry</w:t>
    
    rsid = "61BEE772"
    author = "Ahmed"
    date = "2026-03-01T14:30:00Z"
    
    old_text = "AI estimates fill %; precise volume calculated from known bottle geometry"
    new_text = "The 'Ruler vs. Guesser' Approach: AI acts as a digital ruler to find fill percentage, while the bottle registry anchors results to 100% precise physics and geometry."

    # Construct the tracked change XML
    # We find the run <w:r> that contains our text and replace its content with deletion + insertion
    
    # First, let's find the exact run XML
    # We'll use a more flexible regex to find the <w:r> containing our text
    pattern = r'(<w:r\b[^>]*>.*?<w:t[^>]*>' + re.escape(old_text) + r'</w:t>.*?</w:r>)'
    
    def replacement(match):
        run_xml = match.group(1)
        # Extract properties if any
        rPr_match = re.search(r'(<w:rPr>.*?</w:rPr>)', run_xml)
        rPr = rPr_match.group(1) if rPr_match else ""
        
        deletion = f'<w:del w:author="{author}" w:date="{date}" w:id="0"><w:r>{rPr}<w:delText>{old_text}</w:delText></w:r></w:del>'
        insertion = f'<w:ins w:author="{author}" w:date="{date}" w:id="1"><w:r>{rPr}<w:t>{new_text}</w:t></w:r></w:ins>'
        
        return deletion + insertion

    new_content = re.sub(pattern, replacement, content, flags=re.DOTALL)
    
    if new_content != content:
        with open(xml_path, 'w', encoding='utf-8') as f:
            f.write(new_content)
        print("Successfully updated document.xml with tracked changes manually.")
    else:
        print("Could not find the target text in document.xml")

if __name__ == "__main__":
    update_xml_manually()
