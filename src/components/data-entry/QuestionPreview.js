import { useState } from 'react';
import 'katex/dist/katex.min.css';
import { InlineMath, BlockMath } from 'react-katex';

const QuestionPreview = ({ data, onClose }) => {
    const [showSolution, setShowSolution] = useState(false);

    // Helper function to encode LaTeX for image URLs
    const encodeLatex = (latex) => {
        return encodeURIComponent(latex);
    };

    // Process LaTeX formatting like \textbf, \textit, etc.
    const processLatexFormatting = (text) => {
        const formattingMap = [
            { regex: /\\textbf\{(.*?)\}/g, replacement: '<strong>$1</strong>' },
            { regex: /\\textit\{(.*?)\}/g, replacement: '<em>$1</em>' },
            { regex: /\\emph\{(.*?)\}/g, replacement: '<em>$1</em>' },
            { regex: /\\texttt\{(.*?)\}/g, replacement: '<code>$1</code>' },
            { regex: /\\underline\{(.*?)\}/g, replacement: '<u>$1</u>' },
        ];

        let processedText = text;
        formattingMap.forEach((format) => {
            processedText = processedText.replace(format.regex, format.replacement);
        });
        return processedText;
    };

    const processLatexMath = (latex) => {
        const symbolMap = {
            '\\mathrm{km}': 'km',
            '\\mathrm{jam}': 'jam',
            '\\cdot': '×',
            '\\times': '×',
            '\\div': '÷',
            '\\pm': '±',
            '\\geq': '≥',
            '\\leq': '≤',
            '\\left': '',
            '\\right': '',
            '~': ' ',
            '\\Rightarrow': '=>',
            '\\&': '&',
            '\\\\': ' ',
        };

        let processed = latex;
        Object.entries(symbolMap).forEach(([latexSymbol, replacement]) => {
            processed = processed.replace(new RegExp(latexSymbol.replace(/\\/g, '\\\\'), 'g'), replacement);
        });

        processed = processed.replace(/\\frac\{(.*?)\}\{(.*?)\}/g, '($1)/($2)');

        processed = processed.replace(/\^{(.*?)}/g, ' pangkat ($1)');

        return processed.trim();
    };

    const convertComplexTextToHTML = (text, attachments = []) => {
        if (!text || typeof text !== 'string') return '<p></p>';

        const attachmentMap = {};
        attachments.forEach((attachment, index) => {
            const fileName = attachment.originalName || attachment.name || attachment.fileName;
            attachmentMap[`[attachment:${fileName}]`] = attachment;
        });

        const alignedBlocks = [];
        const gatheredBlocks = [];
        let processedText = text;

        processedText = processedText.replace(
            /\$\$\s*\\begin\{aligned\}([\s\S]*?)\\end\{aligned\}\s*\$\$/g,
            (match, content) => {
                const placeholder = `__ALIGNED_BLOCK_${alignedBlocks.length}__`;
                alignedBlocks.push(`\\begin{aligned}${content}\\end{aligned}`);
                return placeholder;
            }
        );

        processedText = processedText.replace(
            /\$\$\s*\\begin\{gathered\}([\s\S]*?)\\end\{gathered\}\s*\$\$/g,
            (match, content) => {
                const placeholder = `__GATHERED_BLOCK_${gatheredBlocks.length}__`;
                gatheredBlocks.push(`\\begin{gathered}${content}\\end{gathered}`);
                return placeholder;
            }
        );

        processedText = processLatexFormatting(processedText);

        processedText = processedText.replace(/\[\\n\]/g, '<br>');

        const parts = processedText.split(
            /(\$\$[\s\S]*?\$\$|\$[\s\S]*?\$|\[attachment:[^\]]+\]|__ALIGNED_BLOCK_\d+__|__GATHERED_BLOCK_\d+__)/
        );

        const htmlParts = parts.map((part, index) => {
            if (part.startsWith('$$') && part.endsWith('$$')) {
                const mathContent = part.slice(2, -2);
                return `<div class="math-block"><div>${mathContent}</div></div>`;
            } else if (part.startsWith('$') && part.endsWith('$')) {
                const mathContent = part.slice(1, -1);
                const processedMath = processLatexMath(mathContent);
                const encodedMath = encodeLatex(mathContent);
                return `
                    <span class="inline-math" title="${processedMath}">
                        <img 
                            src="https://latex.codecogs.com/gif.latex?${encodedMath}" 
                            alt="${processedMath}" 
                            style="vertical-align: middle; max-height: 1.5em;"
                            onerror="this.style.display='none';this.nextElementSibling.style.display='inline';"
                        />
                        <span style="display: none; background: #f0f0f0; padding: 2px 4px; font-family: monospace; font-size: 0.8em;">${processedMath}</span>
                    </span>
                `;
            } else if (part.match(/__ALIGNED_BLOCK_\d+__/)) {
                const blockIndex = parseInt(part.match(/\d+/)[0]);
                const blockContent = alignedBlocks[blockIndex];
                if (blockContent) {
                    const processedMath = processLatexMath(blockContent);
                    const encodedBlock = encodeLatex(blockContent);
                    return `
                        <div class="aligned-block" style="text-align: center; margin: 15px 0;">
                            <img 
                                src="https://latex.codecogs.com/gif.latex?\\dpi{110}&space;${encodedBlock}" 
                                alt="${processedMath}"
                                style="max-width: 100%; height: auto;"
                                onerror="this.style.display='none';this.nextElementSibling.style.display='block';"
                            />
                            <div style="display: none; background: #f0f0f0; padding: 10px; border: 1px solid #ddd; font-family: monospace; white-space: pre-wrap;">${blockContent}</div>
                        </div>
                    `;
                }
                return '';
            } else if (part.match(/__GATHERED_BLOCK_\d+__/)) {
                const blockIndex = parseInt(part.match(/\d+/)[0]);
                const blockContent = gatheredBlocks[blockIndex];
                if (blockContent) {
                    const processedMath = processLatexMath(blockContent);
                    const encodedBlock = encodeLatex(blockContent);
                    return `
                        <div class="gathered-block" style="text-align: center; margin: 15px 0;">
                            <img 
                                src="https://latex.codecogs.com/gif.latex?\\dpi{110}&space;${encodedBlock}" 
                                alt="${processedMath}"
                                style="max-width: 100%; height: auto;"
                                onerror="this.style.display='none';this.nextElementSibling.style.display='block';"
                            />
                            <div style="display: none; background: #f0f0f0; padding: 10px; border: 1px solid #ddd; font-family: monospace; white-space: pre-wrap;">${blockContent}</div>
                        </div>
                    `;
                }
                return '';
            } else if (part.match(/\[attachment:[^\]]+\]/)) {
                const attachment = attachmentMap[part];
                if (!attachment) return '';
                const fileName = attachment.originalName || attachment.name || attachment.fileName;
                const src =
                    attachment.publicUrl ||
                    attachment.googleDriveUrl ||
                    (attachment instanceof File ? URL.createObjectURL(attachment) : '');
                return `
                    <p class="attachment">
                        <img 
                            src="${src}" 
                            alt="Attachment ${fileName}" 
                            style="max-width: 100%; height: auto; margin: 10px 0;"
                            onerror="this.style.display='none';this.nextElementSibling.style.display='block';"
                        />
                        <div style="display: none; padding: 10px; background-color: #f5f5f5; border: 1px dashed #ccc; text-align: center;">
                            Image failed to load: ${fileName}
                        </div>
                    </p>
                `;
            } else {
                return `<span>${part}</span>`;
            }
        });

        return `<div>${htmlParts.join('')}</div>`;
    };

    const renderContentWithAttachments = (text, attachments) => {
        if (!text) return null;

        const htmlContent = convertComplexTextToHTML(text, attachments);
        return <div dangerouslySetInnerHTML={{ __html: htmlContent }} />;
    };

    const renderQuestion = () => {
        const attachments = (() => {
            try {
                if (Array.isArray(data.question_attachments)) {
                    return data.question_attachments;
                }
                return data.question_attachments ? JSON.parse(data.question_attachments) : [];
            } catch {
                return [];
            }
        })();

        const unusedAttachments = attachments.filter((attachment) => {
            const fileName = attachment.originalName || attachment.name || attachment.fileName;
            return !data.question.includes(`[attachment:${fileName}]`);
        });

        return (
            <div className="question-content">
                <h3>Question</h3>
                <div className="question-text">
                    {renderContentWithAttachments(data.question, attachments)}
                </div>
                {unusedAttachments.length > 0 && (
                    <div className="question-attachments">
                        <h5>Additional Attachments:</h5>
                        {unusedAttachments.map((attachment, index) => (
                            <div key={index} className="attachment-item">
                                <img
                                    src={
                                        attachment.publicUrl ||
                                        attachment.googleDriveUrl ||
                                        (attachment instanceof File
                                            ? URL.createObjectURL(attachment)
                                            : '')
                                    }
                                    alt={`Question attachment ${index + 1}`}
                                    style={{ maxWidth: '100%', height: 'auto', margin: '5px 0' }}
                                    onError={(e) => {
                                        e.target.style.display = 'none';
                                        e.target.nextSibling.style.display = 'block';
                                    }}
                                />
                                <div
                                    style={{
                                        display: 'none',
                                        padding: '10px',
                                        backgroundColor: '#f5f5f5',
                                        border: '1px dashed #ccc',
                                        textAlign: 'center',
                                    }}
                                >
                                    Image failed to load:{' '}
                                    {attachment.originalName || attachment.name || attachment.fileName}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        );
    };

    // Render MCQ options
    const renderMCQOptions = () => {
        if (data.question_type !== 'MCQ') return null;

        const options = ['A', 'B', 'C', 'D', 'E'];

        return (
            <div className="options-content">
                <h4>Answer Options</h4>
                <div className="options-list">
                    {options.map((option) => {
                        const optionText = data[`option_${option.toLowerCase()}`];
                        const isCorrect = data.correct_option === option;

                        return (
                            <div
                                key={option}
                                className={`option-item ${isCorrect ? 'correct' : ''}`}
                            >
                                <span className="option-label">{option}.</span>
                                <span className="option-text">
                                    {renderContentWithAttachments(optionText, [])}
                                </span>
                                {isCorrect && <span className="correct-indicator">✓</span>}
                            </div>
                        );
                    })}
                </div>
            </div>
        );
    };

    const renderCorrectAnswer = () => {
        if (data.question_type === 'MCQ') return null;

        return (
            <div className="correct-answer-content">
                <h4>Correct Answer</h4>
                <div className="correct-answer-text">
                    {renderContentWithAttachments(data.correct_answer, [])}
                </div>
            </div>
        );
    };

    const renderSolution = () => {
        if (!showSolution) return null;

        const attachments = (() => {
            try {
                if (Array.isArray(data.solution_attachments)) {
                    return data.solution_attachments;
                }
                return data.solution_attachments ? JSON.parse(data.solution_attachments) : [];
            } catch {
                return [];
            }
        })();

        const unusedAttachments = attachments.filter((attachment) => {
            const fileName = attachment.originalName || attachment.name || attachment.fileName;
            return !data.solution.includes(`[attachment:${fileName}]`);
        });

        return (
            <div className="solution-content">
                <h4>Solution</h4>
                <div className="solution-text">
                    {renderContentWithAttachments(data.solution, attachments)}
                </div>
                {unusedAttachments.length > 0 && (
                    <div className="solution-attachments">
                        <h5>Additional Attachments:</h5>
                        {unusedAttachments.map((attachment, index) => (
                            <div key={index} className="attachment-item">
                                <img
                                    src={
                                        attachment.publicUrl ||
                                        attachment.googleDriveUrl ||
                                        (attachment instanceof File
                                            ? URL.createObjectURL(attachment)
                                            : '')
                                    }
                                    alt={`Solution attachment ${index + 1}`}
                                    style={{ maxWidth: '100%', height: 'auto', margin: '5px 0' }}
                                    onError={(e) => {
                                        e.target.style.display = 'none';
                                        e.target.nextSibling.style.display = 'block';
                                    }}
                                />
                                <div
                                    style={{
                                        display: 'none',
                                        padding: '10px',
                                        backgroundColor: '#f5f5f5',
                                        border: '1px dashed #ccc',
                                        textAlign: 'center',
                                    }}
                                >
                                    Image failed to load:{' '}
                                    {attachment.originalName || attachment.name || attachment.fileName}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        );
    };

    return (
        <div className="question-preview-overlay">
            <div className="question-preview-modal">
                <div className="modal-header">
                    <h2>Question Preview</h2>
                    <button className="close-btn" onClick={onClose}>
                        ×
                    </button>
                </div>

                <div className="modal-content">
                    <div className="question-meta">
                        <div className="meta-item">
                            <strong>Exam:</strong> {data?.exam || data?.question?.exam}
                        </div>
                        <div className="meta-item">
                            <strong>Subject:</strong>{' '}
                            {data?.subject_name || data.subject?.name || 'Loading...'}
                        </div>
                        <div className="meta-item">
                            <strong>Type:</strong> {data.question_type}
                        </div>
                    </div>

                    {renderQuestion()}
                    {renderMCQOptions()}
                    {renderCorrectAnswer()}

                    <div className="solution-section">
                        <button
                            className="btn btn-outline"
                            onClick={() => setShowSolution(!showSolution)}
                        >
                            {showSolution ? 'Hide Solution' : 'Show Solution'}
                        </button>
                        {renderSolution()}
                    </div>
                </div>

                <div className="modal-actions">
                    <button className="btn btn-secondary" onClick={onClose}>
                        Close
                    </button>
                </div>
            </div>
        </div>
    );
};

const styles = `
    .question-preview-modal {
        max-width: 800px;
        margin: 20px auto;
        padding: 20px;
        background: #fff;
        border-radius: 8px;
        box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
    }

    .question-content, .options-content, .correct-answer-content, .solution-content {
        margin-bottom: 20px;
    }

    .question-text, .solution-text, .correct-answer-text {
        line-height: 1.6;
    }

    .question-text p, .solution-text p, .correct-answer-text p {
        margin: 10px 0;
    }

    .inline-math img {
        vertical-align: middle;
    }

    .math-block {
        text-align: center;
        margin: 10px 0;
    }

    .aligned-block, .gathered-block {
        text-align: center;
        margin: 15px 0;
        padding: 10px;
        background: #fafafa;
        border-radius: 4px;
    }

    .attachment img {
        display: block;
        max-width: 100%;
        height: auto;
        margin: 10px 0;
    }

    .options-list {
        display: flex;
        flex-direction: column;
        gap: 10px;
    }

    .option-item {
        display: flex;
        align-items: center;
        gap: 10px;
    }

    .correct-indicator {
        color: green;
        font-weight: bold;
    }
`;

if (typeof document !== 'undefined') {
    const styleSheet = document.createElement('style');
    styleSheet.innerText = styles;
    document.head.appendChild(styleSheet);
}

export default QuestionPreview;