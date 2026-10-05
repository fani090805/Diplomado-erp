package com.diplomado.erp.feature.projects.presentation

import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.outlined.Engineering
import androidx.compose.material.icons.outlined.LocationOn
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.LinearProgressIndicator
import androidx.compose.material3.Text
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.lifecycle.viewmodel.compose.viewModel
import com.diplomado.erp.core.network.dto.ProjectDto
import com.diplomado.erp.ui.components.*
import com.diplomado.erp.ui.theme.*

@Composable
fun ProjectsScreen(
    onProjectClick: (String) -> Unit,
    modifier: Modifier = Modifier,
    viewModel: ProjectsViewModel = viewModel()
) {
    val uiState by viewModel.uiState.collectAsState()
    var searchQuery by remember { mutableStateOf("") }

    Column(
        modifier = modifier
            .fillMaxSize()
            .padding(16.dp),
        verticalArrangement = Arrangement.spacedBy(16.dp)
    ) {
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically
        ) {
            Column {
                Text(
                    text = "Mis Obras",
                    fontSize = 22.sp,
                    fontWeight = FontWeight.ExtraBold,
                    color = FaiTextPrimary
                )
                Text(
                    text = "Proyectos y centros de costo",
                    fontSize = 12.sp,
                    color = FaiTextMuted
                )
            }
        }

        TTTextField(
            value = searchQuery,
            onValueChange = {
                searchQuery = it
                viewModel.loadProjects(searchQuery.ifEmpty { null })
            },
            label = "Buscar Obra",
            placeholder = "Buscar por código, nombre o ubicación..."
        )

        when (val state = uiState) {
            is ProjectsUiState.Loading -> {
                TTLoading(text = "Cargando obras...")
            }
            is ProjectsUiState.Error -> {
                TTEmptyState(
                    title = "Error al consultar obras",
                    description = state.message,
                    actionLabel = "Reintentar",
                    onAction = { viewModel.loadProjects() }
                )
            }
            is ProjectsUiState.Success -> {
                if (state.projects.isEmpty()) {
                    TTEmptyState(
                        title = "Sin obras registradas",
                        description = "No existen proyectos que coincidan con la búsqueda."
                    )
                } else {
                    LazyColumn(
                        modifier = Modifier.fillMaxSize(),
                        verticalArrangement = Arrangement.spacedBy(12.dp)
                    ) {
                        items(state.projects) { project ->
                            ProjectCard(project = project, onClick = { onProjectClick(project.id) })
                        }
                    }
                }
            }
        }
    }
}

@Composable
fun ProjectCard(
    project: ProjectDto,
    onClick: () -> Unit
) {
    val progress = if (project.budget > 0) (project.executedAmount / project.budget).coerceIn(0.0, 1.0).toFloat() else 0f
    val percentage = (progress * 100).toInt()

    TTCard(
        modifier = Modifier.clickable { onClick() }
    ) {
        Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Column(modifier = Modifier.weight(1f)) {
                    Text(
                        text = "${project.code} · ${project.name}",
                        fontSize = 16.sp,
                        fontWeight = FontWeight.Bold,
                        color = FaiTextPrimary
                    )
                    if (!project.location.isNullOrEmpty()) {
                        TTIconText(icon = Icons.Outlined.LocationOn, text = project.location ?: "")
                    }
                }
                TTBadge(
                    status = project.status,
                    customLabel = project.status.replace("_", " ")
                )
            }

            if (!project.description.isNullOrEmpty()) {
                Text(
                    text = project.description,
                    fontSize = 12.sp,
                    color = FaiTextSecondary
                )
            }

            Column(verticalArrangement = Arrangement.spacedBy(4.dp)) {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween
                ) {
                    Text(
                        text = "Ejecutado: $${String.format("%.2f", project.executedAmount)}",
                        fontSize = 11.sp,
                        color = FaiTextSecondary
                    )
                    Text(
                        text = "Presupuesto: $${String.format("%.2f", project.budget)} ($percentage%)",
                        fontSize = 11.sp,
                        fontWeight = FontWeight.Bold,
                        color = FaiPrimary
                    )
                }

                LinearProgressIndicator(
                    progress = progress,
                    modifier = Modifier
                        .fillMaxWidth()
                        .height(8.dp)
                        .clip(RoundedCornerShape(4.dp)),
                    color = if (percentage > 90) FaiError else FaiPrimary,
                    trackColor = FaiBorder,
                )
            }

            if (!project.managerName.isNullOrEmpty()) {
                TTIconText(
                    icon = Icons.Outlined.Engineering,
                    text = "Responsable: ${project.managerName}",
                    fontSize = 11.sp
                )
            }
        }
    }
}
