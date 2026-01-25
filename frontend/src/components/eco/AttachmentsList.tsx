import { useState } from 'react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../ui/card';
import { Paperclip, Plus, File } from 'lucide-react';
import { ecoService } from '../../services/ecoService';

interface Attachment {
    id: string;
    filename: string;
    url: string;
    action: string;
}

interface AttachmentsListProps {
    ecoId: string;
    initialAttachments: Attachment[];
    canEdit: boolean;
    token: string;
    onUpdate: () => void;
}

export function AttachmentsList({ ecoId, initialAttachments, canEdit, token, onUpdate }: AttachmentsListProps) {
    const [isUploading, setIsUploading] = useState(false);
    const [newFileUrl, setNewFileUrl] = useState('');
    const [newFileName, setNewFileName] = useState('');

    const handleAdd = async () => {
        if (!newFileName || !newFileUrl) return;
        setIsUploading(true);
        try {
            // In a real app, this would be a file upload. Here we just link a URL.
            await ecoService.addDraftAttachment(token, ecoId, newFileName, newFileUrl, 'ADD');
            setNewFileUrl('');
            setNewFileName('');
            onUpdate();
        } catch (error) {
            console.error('Failed to add attachment', error);
            alert('Failed to add attachment');
        } finally {
            setIsUploading(false);
        }
    };

    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <Paperclip className="h-5 w-5 text-blue-600" />
                    Attachments
                </CardTitle>
                <CardDescription>Manage draft documents and files</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                <div className="space-y-2">
                    {initialAttachments?.length === 0 ? (
                        <div className="text-center py-4 text-muted-foreground text-sm">No attachments</div>
                    ) : (
                        initialAttachments?.map((att, idx) => (
                            <div key={idx} className="flex items-center justify-between p-2 border rounded-md bg-white">
                                <div className="flex items-center gap-3">
                                    <File className="h-4 w-4 text-gray-500" />
                                    <div>
                                        <div className="text-sm font-medium">{att.filename}</div>
                                        <div className="text-xs text-muted-foreground truncate max-w-[200px]">{att.url}</div>
                                    </div>
                                </div>
                                <div className="text-xs font-semibold px-2 py-1 rounded bg-gray-100">{att.action}</div>
                            </div>
                        ))
                    )}
                </div>

                {canEdit && (
                    <div className="flex items-end gap-2 pt-2 border-t">
                        <div className="flex-1 space-y-1">
                            <Input
                                placeholder="File Name"
                                value={newFileName}
                                onChange={(e) => setNewFileName(e.target.value)}
                                className="h-8 text-sm"
                            />
                        </div>
                        <div className="flex-1 space-y-1">
                            <Input
                                placeholder="File URL / Link"
                                value={newFileUrl}
                                onChange={(e) => setNewFileUrl(e.target.value)}
                                className="h-8 text-sm"
                            />
                        </div>
                        <Button size="sm" onClick={handleAdd} disabled={!newFileName || !newFileUrl || isUploading}>
                            <Plus className="h-4 w-4" />
                        </Button>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
