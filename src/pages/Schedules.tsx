import React, { useState, useEffect, Fragment } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Checkbox } from '@/components/ui/checkbox';
import { 
    AlertDialog, 
    AlertDialogAction, 
    AlertDialogCancel, 
    AlertDialogContent, 
    AlertDialogDescription, 
    AlertDialogFooter, 
    AlertDialogHeader, 
    AlertDialogTitle 
} from '@/components/ui/alert-dialog';
import { getSchedules, addSchedule, updateSchedule, deleteSchedule, Schedule } from '@/lib/db';
import { invoke } from "@tauri-apps/api/core";
import { useSettingsStore } from "@/store/useSettingsStore";
import { toast } from 'sonner';
import { ChevronDown, ChevronRight, Database as DbIcon, RefreshCw, Loader2 } from "lucide-react";

const Schedules: React.FC = () => {
    const [schedules, setSchedules] = useState<Schedule[]>([]);
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
    const [scheduleToDelete, setScheduleToDelete] = useState<number | null>(null);
    const [currentSchedule, setCurrentSchedule] = useState<Partial<Schedule> | null>(null);
    const [availableDatabases, setAvailableDatabases] = useState<string[]>([]);
    const [isLoadingDatabases, setIsLoadingDatabases] = useState(false);
    const [expandedRows, setExpandedRows] = useState<number[]>([]);
    const settings = useSettingsStore();

    useEffect(() => {
        loadSchedules();
    }, []);

    const loadSchedules = async () => {
        const data = await getSchedules();
        setSchedules(data);
    };

    const toggleRow = (id: number) => {
        setExpandedRows((prev) =>
            prev.includes(id) ? prev.filter((rowId) => rowId !== id) : [...prev, id],
        );
    };

    const fetchAvailableDatabases = async () => {
        setIsLoadingDatabases(true);
        try {
            const result: any[] = await invoke("list_databases", {
                host: settings.host,
                port: settings.port,
                user: settings.user,
                password: settings.password,
            });
            setAvailableDatabases(result.map(db => db.name));
        } catch (error) {
            console.error("Failed to fetch databases", error);
            toast.error("Failed to connect to MySQL server. Check settings.");
        } finally {
            setIsLoadingDatabases(false);
        }
    };

    const handleSave = async () => {
        if (!currentSchedule) return;

        try {
            if (currentSchedule.id) {
                await updateSchedule(currentSchedule as Schedule);
                toast.success('Schedule updated successfully!');
            } else {
                await addSchedule(currentSchedule as Omit<Schedule, 'id'>);
                toast.success('Schedule added successfully!');
            }
            setIsFormOpen(false);
            setCurrentSchedule(null);
            loadSchedules();
        } catch (error) {
            toast.error('Failed to save schedule.');
            console.error(error);
        }
    };

    const handleDeleteClick = (id: number) => {
        setScheduleToDelete(id);
        setIsDeleteDialogOpen(true);
    };

    const confirmDelete = async () => {
        if (scheduleToDelete === null) return;
        
        try {
            await deleteSchedule(scheduleToDelete);
            toast.success('Schedule deleted successfully!');
            loadSchedules();
        } catch (error) {
            toast.error('Failed to delete schedule.');
        } finally {
            setIsDeleteDialogOpen(false);
            setScheduleToDelete(null);
        }
    };

    useEffect(() => {
        if (isFormOpen) {
            fetchAvailableDatabases();
        }
    }, [isFormOpen]);

    const openForm = (schedule: Partial<Schedule> | null = null) => {
        setCurrentSchedule(schedule || {
            name: '',
            databases: '',
            frequency: 'daily',
            time: '02:00',
            is_active: true,
            backup_type: 'sql'
        });
        setIsFormOpen(true);
    };

    const toggleDatabaseSelection = (db: string) => {
        const currentDbs = currentSchedule?.databases?.split(',').filter(Boolean) || [];
        const newDbs = currentDbs.includes(db)
            ? currentDbs.filter((d: string) => d !== db)
            : [...currentDbs, db];
        setCurrentSchedule((s: any) => ({ ...s, databases: newDbs.join(',') }));
    };

    return (
        <div className="p-6 space-y-6">
            <div className="flex items-center justify-between">
                <h1 className="text-3xl font-bold">Schedules</h1>
                <Button onClick={() => openForm()} className="rounded-md">Add Schedule</Button>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Your Backup Schedules</CardTitle>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead className="w-[40px]"></TableHead>
                                <TableHead>Name</TableHead>
                                <TableHead>Databases</TableHead>
                                <TableHead>Frequency</TableHead>
                                <TableHead>Time</TableHead>
                                <TableHead>Active</TableHead>
                                <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {schedules.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={7} className="text-center py-10 text-muted-foreground">
                                        No Backup Schedules
                                    </TableCell>
                                </TableRow>
                            ) : (
                                schedules.map((s) => {
                                    const isExpanded = expandedRows.includes(s.id);
                                    const dbList = s.databases.split(',').filter(Boolean);
                                    
                                    return (
                                        <Fragment key={s.id}>
                                            <TableRow className="hover:bg-muted/50 transition-colors cursor-pointer" onClick={() => toggleRow(s.id)}>
                                                <TableCell>
                                                    {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                                                </TableCell>
                                                <TableCell className="font-medium">{s.name}</TableCell>
                                                <TableCell>
                                                    <span className="font-medium text-sm">
                                                        {dbList.length} database(s)
                                                    </span>
                                                </TableCell>
                                                <TableCell className="capitalize">{s.frequency}</TableCell>
                                                <TableCell>{s.time}</TableCell>
                                                <TableCell onClick={(e) => e.stopPropagation()}>
                                                    <Switch checked={s.is_active} onCheckedChange={async (checked) => {
                                                        await updateSchedule({ ...s, is_active: checked });
                                                        loadSchedules();
                                                    }} />
                                                </TableCell>
                                                <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                                                    <Button variant="outline" size="sm" className="mr-2 rounded-md" onClick={() => openForm(s)}>Edit</Button>
                                                    <Button variant="destructive" size="sm" className="rounded-md" onClick={() => handleDeleteClick(s.id)}>Delete</Button>
                                                </TableCell>
                                            </TableRow>
                                            {isExpanded && (
                                                <TableRow className="bg-muted/30">
                                                    <TableCell colSpan={7} className="py-4">
                                                        <div className="pl-12 space-y-2">
                                                            <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Included Databases:</h4>
                                                            <div className="flex flex-wrap gap-2">
                                                                {dbList.map((db: string, idx: number) => (
                                                                    <div key={idx} className="flex items-center gap-1.5 bg-background border rounded-md px-2 py-1 text-sm shadow-sm">
                                                                        <DbIcon className="h-3 w-3 text-primary" />
                                                                        <span>{db}</span>
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        </div>
                                                    </TableCell>
                                                </TableRow>
                                            )}
                                        </Fragment>
                                    );
                                })
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>

            <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
                <DialogContent className="max-w-md">
                    <DialogHeader>
                        <DialogTitle>{currentSchedule?.id ? 'Edit' : 'Add'} Schedule</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="name" className="text-right">Name</Label>
                            <Input id="name" value={currentSchedule?.name} onChange={e => setCurrentSchedule((s: any) => ({...s, name: e.target.value}))} className="col-span-3" />
                        </div>
                        
                        <div className="grid grid-cols-4 items-start gap-4">
                            <div className="text-right mt-2 flex flex-col gap-1">
                                <Label>Databases</Label>
                                <Button 
                                    variant="ghost" 
                                    size="sm" 
                                    className="h-7 px-2 text-[10px] uppercase font-bold text-primary"
                                    onClick={(e) => {
                                        e.preventDefault();
                                        fetchAvailableDatabases();
                                    }}
                                    disabled={isLoadingDatabases}
                                >
                                    {isLoadingDatabases ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <RefreshCw className="h-3 w-3 mr-1" />}
                                    Refresh
                                </Button>
                            </div>
                            <div className="col-span-3 border rounded-md p-2 max-h-40 overflow-y-auto space-y-2 relative">
                                {isLoadingDatabases ? (
                                    <div className="flex flex-col items-center justify-center py-6 gap-2 opacity-60">
                                        <Loader2 className="h-5 w-5 animate-spin text-primary" />
                                        <span className="text-xs font-medium">Scanning MySQL...</span>
                                    </div>
                                ) : (
                                    <>
                                        {availableDatabases.length === 0 && <p className="text-xs text-muted-foreground p-2 text-center italic">No databases found.<br/>Check your connection settings.</p>}
                                        {availableDatabases.map(db => (
                                            <div key={db} className="flex items-center space-x-2 px-1 hover:bg-muted/50 rounded transition-colors">
                                                <Checkbox 
                                                    id={db} 
                                                    checked={currentSchedule?.databases?.split(',').includes(db)}
                                                    onCheckedChange={() => toggleDatabaseSelection(db)}
                                                />
                                                <label htmlFor={db} className="text-sm font-medium leading-none py-2 w-full cursor-pointer">
                                                    {db}
                                                </label>
                                            </div>
                                        ))}
                                    </>
                                )}
                            </div>
                        </div>

                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="frequency" className="text-right">Frequency</Label>
                            <Select value={currentSchedule?.frequency} onValueChange={(v: any) => setCurrentSchedule((s: any) => ({...s, frequency: v}))}>
                                <SelectTrigger className="col-span-3">
                                    <SelectValue placeholder="Select frequency" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="daily">Daily</SelectItem>
                                    <SelectItem value="weekly">Weekly</SelectItem>
                                    <SelectItem value="monthly">Monthly</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                         {currentSchedule?.frequency === 'weekly' && (
                            <div className="grid grid-cols-4 items-center gap-4">
                                <Label className="text-right">Day of Week</Label>
                                 <Select value={currentSchedule?.day_of_week?.toString()} onValueChange={(v) => setCurrentSchedule((s: any) => ({...s, day_of_week: Number(v)}))}>
                                     <SelectTrigger className="col-span-3">
                                         <SelectValue placeholder="Select day" />
                                     </SelectTrigger>
                                     <SelectContent>
                                         <SelectItem value="0">Sunday</SelectItem>
                                         <SelectItem value="1">Monday</SelectItem>
                                         <SelectItem value="2">Tuesday</SelectItem>
                                         <SelectItem value="3">Wednesday</SelectItem>
                                         <SelectItem value="4">Thursday</SelectItem>
                                         <SelectItem value="5">Friday</SelectItem>
                                         <SelectItem value="6">Saturday</SelectItem>
                                     </SelectContent>
                                 </Select>
                            </div>
                        )}
                        {currentSchedule?.frequency === 'monthly' && (
                             <div className="grid grid-cols-4 items-center gap-4">
                                 <Label className="text-right">Day of Month</Label>
                                 <Input type="number" min={1} max={31} value={currentSchedule?.day_of_month} onChange={e => setCurrentSchedule((s: any) => ({...s, day_of_month: Number(e.target.value)}))} className="col-span-3" />
                             </div>
                        )}
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="time" className="text-right">Time</Label>
                            <Input id="time" type="time" value={currentSchedule?.time} onChange={e => setCurrentSchedule((s: any) => ({...s, time: e.target.value}))} className="col-span-3" />
                        </div>
                        <div className="flex justify-end pt-4">
                            <Button onClick={handleSave} className="rounded-md">Save</Button>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>

            <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                        <AlertDialogDescription>
                            This will permanently delete the backup schedule. This action cannot be undone.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel className="rounded-md">Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={confirmDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90 rounded-md">
                            Delete
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
};

export default Schedules;
