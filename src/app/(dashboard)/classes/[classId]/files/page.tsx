import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { ClassFile } from '@/types'
import { format } from 'date-fns'
import { Card, CardContent } from '@/components/ui/card'
import { UploadFileDialog } from '@/components/files/upload-file-dialog'
import { DeleteFileButton } from '@/components/files/delete-file-button'
import { Download, FileText, FileImage, File, FolderOpen } from 'lucide-react'

function FileIcon({ type }: { type: string }) {
  if (type.includes('image')) return <FileImage className="h-8 w-8 text-green-500" />
  if (type.includes('pdf')) return <FileText className="h-8 w-8 text-red-500" />
  return <File className="h-8 w-8 text-blue-500" />
}

function formatSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export default async function FilesPage({ params }: { params: Promise<{ classId: string }> }) {
  const { classId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  const isTeacher = profile?.role === 'teacher'

  const { data: files } = await supabase
    .from('class_files')
    .select('*, uploader:profiles(full_name)')
    .eq('class_id', classId)
    .order('created_at', { ascending: false })

  return (
    <div className="space-y-6 animate-fade-up">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-lg font-bold text-gray-900 dark:text-white">Files</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">Download study materials and resources</p>
        </div>
        {isTeacher && <div className="self-start sm:self-auto"><UploadFileDialog classId={classId} /></div>}
      </div>

      {!files || files.length === 0 ? (
        <Card className="border-0 shadow-sm dark:bg-card">
          <CardContent className="py-16 flex flex-col items-center text-center">
            <FolderOpen className="h-12 w-12 text-gray-200 dark:text-gray-700 mb-4" />
            <p className="font-medium text-gray-700 dark:text-gray-300">No files uploaded</p>
            <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">
              {isTeacher ? 'Upload PDFs and documents for students' : 'Your teacher hasn\'t uploaded any files yet'}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 stagger">
          {files.map((file: ClassFile & { uploader: { full_name: string } }) => (
            <Card key={file.id} className="border-0 shadow-sm dark:bg-card card-hover animate-fade-up">
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0 mt-1">
                    <FileIcon type={file.file_type} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-900 dark:text-white truncate text-sm">{file.title}</p>
                    {file.description && (
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 line-clamp-2">{file.description}</p>
                    )}
                    <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                      {formatSize(file.file_size)} · {format(new Date(file.created_at), 'MMM d, yyyy')}
                    </p>
                    <p className="text-xs text-gray-400 dark:text-gray-500">by {file.uploader?.full_name}</p>
                  </div>
                </div>
                <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-100 dark:border-white/8">
                  <a
                    href={file.file_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    download={file.file_name}
                    className="flex items-center gap-1.5 text-xs font-medium text-indigo-600 dark:text-indigo-400 hover:text-indigo-700"
                  >
                    <Download className="h-3.5 w-3.5" />
                    Download
                  </a>
                  {isTeacher && <DeleteFileButton fileId={file.id} fileUrl={file.file_url} />}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
