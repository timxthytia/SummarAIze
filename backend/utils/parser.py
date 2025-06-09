import re

def parse_test_paper(text: str):
    questions = []
    raw_questions = re.split(r'\n(?=\d+\.\s)', text.strip())  # Split on "1. ", "2. ", etc

    for block in raw_questions:
        block = block.strip()
        if not block:
            continue

        question_lines = block.splitlines()
        question_text = question_lines[0]

        # Scan for MCQ options (A., B., etc.)
        options = []
        for line in question_lines[1:]:
            match = re.match(r"^[A-D]\.\s+(.*)", line)
            if match:
                options.append(match.group(0))

        if options: # Treat as MCQ question
            correct_answer = None
            for line in question_lines:
                ans_match = re.match(r"^(Answer|Solution):\s*([A-D])", line, re.IGNORECASE)
                if ans_match:
                    correct_answer = ans_match.group(2)

            questions.append({
                "questionText": question_text,
                "type": "mcq",
                "options": options,
                "correctAnswer": correct_answer
            })
        else: # Treat as open-ended question
            questions.append({
                "questionText": question_text,
                "type": "open-ended"
            })

    return questions