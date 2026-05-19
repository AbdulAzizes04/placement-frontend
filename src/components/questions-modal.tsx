"use client";

import { useState } from "react";
import { Modal } from "@/components/ui/modal";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { usePlacement } from "@/contexts/PlacementContext";
import { Send, CheckCircle, Circle } from "lucide-react";
import { toast } from "sonner";

interface QuestionsModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export function QuestionsModal({ isOpen, onClose }: QuestionsModalProps) {
    const { questions, answerQuestion } = usePlacement();
    const [replyText, setReplyText] = useState("");
    const [replyingTo, setReplyingTo] = useState<string | null>(null);
    const [filter, setFilter] = useState<'ALL' | 'UNANSWERED'>('UNANSWERED');

    const filteredQuestions = questions.filter(q => {
        if (filter === 'UNANSWERED') return !q.answer;
        return true;
    });

    const handleReply = (questionId: string) => {
        if (!replyText.trim()) return;
        answerQuestion(questionId, replyText, "Admin/Staff");
        setReplyText("");
        setReplyingTo(null);
        toast.success("Response sent.");
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Student Inquiries">
            <div className="flex flex-col h-[500px]">
                {/* Filter Tabs */}
                <div className="flex gap-2 mb-4 border-b pb-2">
                    <Button
                        variant={filter === 'UNANSWERED' ? "default" : "ghost"}
                        size="sm"
                        onClick={() => setFilter('UNANSWERED')}
                    >
                        Unanswered
                    </Button>
                    <Button
                        variant={filter === 'ALL' ? "default" : "ghost"}
                        size="sm"
                        onClick={() => setFilter('ALL')}
                    >
                        All History
                    </Button>
                </div>

                <div className="flex-1 overflow-y-auto space-y-4 pr-2">
                    {filteredQuestions.length === 0 && (
                        <div className="text-center py-10 text-gray-500">
                            <CheckCircle className="w-12 h-12 mx-auto mb-2 text-green-200" />
                            <p>All caught up! No questions found.</p>
                        </div>
                    )}

                    {filteredQuestions.map(q => (
                        <div key={q.id} className="border rounded-lg p-3 bg-white shadow-sm space-y-2">
                            <div className="flex justify-between items-start">
                                <div>
                                    <p className="font-semibold text-sm text-gray-900">{q.studentName}</p>
                                    <p className="text-xs text-muted-foreground" suppressHydrationWarning>ID: {q.studentId} • {new Date(q.createdAt).toLocaleString()}</p>
                                </div>
                                {!q.answer && <Circle className="w-3 h-3 text-red-500 fill-current" />}
                            </div>

                            <p className="text-sm font-medium text-gray-800 bg-gray-50 p-2 rounded">{q.question}</p>

                            {q.answer ? (
                                <div className="bg-blue-50 p-2 rounded border border-blue-100 mt-2 text-sm">
                                    <p className="font-medium text-blue-800 flex items-center gap-1">
                                        <CheckCircle className="w-3 h-3" /> Answered by {q.answeredBy}
                                    </p>
                                    <p className="text-gray-700 mt-1">{q.answer}</p>
                                </div>
                            ) : (
                                <div className="mt-2">
                                    {replyingTo === q.id ? (
                                        <div className="flex gap-2">
                                            <Input
                                                className="flex-1"
                                                placeholder="Type your reply..."
                                                value={replyText}
                                                onChange={(e) => setReplyText(e.target.value)}
                                                onKeyDown={(e) => e.key === 'Enter' && handleReply(q.id)}
                                                autoFocus
                                            />
                                            <Button size="icon" onClick={() => handleReply(q.id)}>
                                                <Send className="w-4 h-4" />
                                            </Button>
                                        </div>
                                    ) : (
                                        <Button variant="outline" size="sm" className="w-full" onClick={() => setReplyingTo(q.id)}>
                                            Reply
                                        </Button>
                                    )}
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            </div>
        </Modal>
    );
}
