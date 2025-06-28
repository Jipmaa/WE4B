import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { 
  DepositedFilesResponse, 
  MyDepositedFilesResponse, 
  FileDepositSubmissionRequest,
  GradeDepositRequest,
  GradeDepositResponse,
  TeacherDepositsResponse,
  DeleteDepositResponse,
  DepositStatsResponse 
} from '@/core/models/deposited-files.models';
import { ApiResponse } from '@/core/models/_shared.models';

@Injectable({
  providedIn: 'root'
})
export class DepositedFilesService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = `${environment.apiUrl}/course-activities`;

  // Student methods

  getMyDeposit(activityId: string): Observable<MyDepositedFilesResponse> {
    return this.http.get<MyDepositedFilesResponse>(`${this.apiUrl}/${activityId}/deposits/my`);
  }

  submitDeposit(activityId: string, data: FileDepositSubmissionRequest): Observable<any> {
    const formData = new FormData();
    data.files.forEach(file => {
      formData.append('files', file);
    });

    return this.http.post(`${this.apiUrl}/${activityId}/deposits`, formData);
  }

  updateDeposit(activityId: string, data: FileDepositSubmissionRequest): Observable<any> {
    const formData = new FormData();
    data.files.forEach(file => {
      formData.append('files', file);
    });

    return this.http.put(`${this.apiUrl}/${activityId}/deposits`, formData);
  }

  deleteDeposit(activityId: string): Observable<DeleteDepositResponse> {
    return this.http.delete<DeleteDepositResponse>(`${this.apiUrl}/${activityId}/deposits`);
  }

  // Teacher methods

  getTeacherView(activityId: string): Observable<ApiResponse<TeacherDepositsResponse>> {
    return this.http.get<ApiResponse<TeacherDepositsResponse>>(`${this.apiUrl}/${activityId}/deposits/teacher-view`);
  }

  getAllDeposits(
    activityId: string, 
    page: number = 1, 
    limit: number = 10,
    userId?: string
  ): Observable<DepositedFilesResponse> {
    let params: any = { page: page.toString(), limit: limit.toString() };
    if (userId) {
      params.userId = userId;
    }

    return this.http.get<DepositedFilesResponse>(`${this.apiUrl}/${activityId}/deposits`, { params });
  }

  getDepositById(activityId: string, depositId: string): Observable<any> {
    return this.http.get(`${this.apiUrl}/${activityId}/deposits/${depositId}`);
  }

  gradeDeposit(activityId: string, depositId: string, gradeData: GradeDepositRequest): Observable<GradeDepositResponse> {
    return this.http.put<GradeDepositResponse>(`${this.apiUrl}/${activityId}/deposits/${depositId}/grade`, gradeData);
  }

  getDepositStats(activityId: string): Observable<DepositStatsResponse> {
    return this.http.get<DepositStatsResponse>(`${this.apiUrl}/${activityId}/deposits/stats`);
  }

  // Download methods

  downloadDeposit(activityId: string, depositId: string): Observable<Blob> {
    return this.http.get(`${this.apiUrl}/${activityId}/deposits/${depositId}/download`, {
      responseType: 'blob'
    });
  }

  downloadAllDeposits(activityId: string): Observable<Blob> {
    return this.http.get(`${this.apiUrl}/${activityId}/deposits/download-all`, {
      responseType: 'blob'
    });
  }
}